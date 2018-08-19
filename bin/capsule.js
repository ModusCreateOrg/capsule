#!/usr/bin/env node
//#############################################################################
// @licence: MIT
// @description: Automated CLI for Static web application hosting on AWS
//#############################################################################

const fs = require('fs');
const commander = require('commander');
const chalk = require('chalk');
const aws = require('aws-sdk');
let cf;

//#############################################################################

commander
  .version('0.0.1')
  .option('init', 'Initializes the s3 bucket required to store nested stack templates')
  .option('apply', 'Updates the templates into the s3 bucket and runs the nested stack')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .option('-v, --verbose', 'verbose output')
  .parse(process.argv);

// Globals ####################################################################

const {
  // AWS Access Key
  AWS_ACCESS_KEY_ID,
  // AWS secret key
  AWS_SECRET_ACCESS_KEY,
  // AWS profile name
  AWS_PROFILE,
  // AWS region
  AWS_REGION
} = process.env;

// References
// - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab2c15c15c17c11
const stack_states = [
  'CREATE_COMPLETE',
  'CREATE_FAILED',
  'DELETE_COMPLETE',
  'DELETE_FAILED',
  'UPDATE_COMPLETE',
  'UPDATE_FAILED',
  'ROLLBACK_COMPLETE',
  'ROLLBACK_FAILED',
  'UPDATE_ROLLBACK_COMPLETE',
  'UPDATE_ROLLBACK_FAILED',
  'REVIEW_IN_PROGRESS'
];

const paths = {
  base: `${__dirname}/../`,
  ci_s3: 'ci/s3_cloudformation.cf'
}

let last_time = new Date(new Date - 1000);

// Helpers ####################################################################

const logIfVerbose = (str, error) => {
  if (commander.verbose){
    if (error){
      console.error(`ERROR: ${str}`);
    } else {
      console.log(chalk.bgGreen(`INFO: ${str}`));
    }
  }
}

const printError = (str) => console.error(chalk.red(`ERROR: ${str}`));

const printErrorAndDie = (str, showHelp) => {
  printError(str);
  if (showHelp) commander.help();
  process.exit(1);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// File Helpers ##############################################################

// TODO: This may require to get it from github directly to avoid packing it
const getTemplateBody = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

const getCiS3Template = () => getTemplateBody(`${paths.base}/${paths.ci_s3}`);

// AWS Helpers ################################################################

const loadAWSConfiguration = async (config_path, aws_profile) => {
  // Environment variables should have higher precedence
  // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
  if ((AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) || AWS_PROFILE) {
    // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
    // Reference: https://github.com/aws/aws-sdk-js/pull/1391
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials();
  } if (aws_profile) {
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials({profile: aws_profile});
  } else if (config_path) {
    // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-json-file.html
    aws.config.loadFromPath(config_path);
  } else {
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials();
  }

  // Load the cloudformation library with authentication already set
  cf = new aws.CloudFormation();
}

const createStack = async (name, template_body, parameters) => {
  // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
  return new Promise((resolve, reject) => {
    let formated_parameters = [];

    for (let p in parameters) {
      formated_parameters.push({
        ParameterKey: p,
        ParameterValue: parameters[p]
      });
    }

    cf.createStack({
      StackName: name,
      ClientRequestToken: name,
      Parameters: formated_parameters,
      Tags: [
        { Key: 'name', Value: name },
        { Key: 'provisioner', Value: 'capsule' }
      ],
      Capabilities: [ 'CAPABILITY_IAM' ],
      TemplateBody: template_body
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const getNextStackEvent = async (id, next) => {
  // References:
  // - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStackEvents-property
  // - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-listing-event-history.html
  return new Promise((resolve, reject) => {
    cf.describeStackEvents({
      StackName: id,
      NextToken: next
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const getStackEvents = async (id) => {
  let response = await getNextStackEvent(id);
  let events = response.StackEvents;
  while (typeof response.NextToken !== 'undefined') {
    response = await getNextStackEvent(id);
    events.concat(response.StackEvents);
  }

  let nestedStackIds = events.reduce((list, e) => {
    if (e.ResourceType === 'AWS::CloudFormation::Stack' &&
        e.PhysicalResourceId != '' && e.StackId != e.PhysicalResourceId) {
      list.push(e.StackId);
    }
    return list;
  }, []);

  for (id of nestedStackIds) events.concat(await getStackEvents(id));
  return events.sort((e1, e2) => e1.Timestamp - e2.Timestamp);
};

const monitorStackProgress = async (name, id) => {
  let in_progress = true;
  let events_seen = []
  logIfVerbose(`Start monitoring stack ${id}`);
  while (in_progress) {
    let events = await getStackEvents(id);
    for (e of events) {
      if (e.Timestamp < last_time || events_seen.includes(e)) {
        logIfVerbose(`Event ignored: ${e}`);
        console.log(e.Timestamp, last_time);
      } else {
        console.log('NEW Event: ',e);
        events_seen.push(e);
        last_time = e.Timestamp;
      }
      if (e.ResourceType === 'AWS::CloudFormation::Stack' &&
          e.StackId === id && e.PhysicalResourceId === id &&
          stack_states.includes(e.ResourceStatus))
      {
        in_progress = false;
      }
    }
    if (in_progress) {
      await delay(2000);
    }
  }
  logIfVerbose(`End monitoring stack ${id}`);
}

const createCIS3Bucket = async (name) => {
  let { StackId } = await createStack(
    name,
    await getCiS3Template(),
    { ProjectName : name }
  );
  await monitorStackProgress(name, StackId);
}

// MAIN #######################################################################

(async () => {
  global.cwd = process.cwd();
  await loadAWSConfiguration(commander.config, commander.awsProfile);

  if (!commander.projectName) {
    printErrorAndDie('Project name is required!', true);
  }

  if (commander.init) {
    await createCIS3Bucket(commander.projectName);
  }
})();

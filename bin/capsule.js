#!/usr/bin/env node
//#############################################################################
// @licence: MIT
// @description: Automated CLI for Static web application hosting on AWS
//#############################################################################

const fs = require('fs');
const commander = require('commander');
const chalk = require('chalk');
const aws = require('aws-sdk');
const path = require('path');
const pkginfo = require('pkginfo')(module);
const Spinner = require('cli-spinner').Spinner;
const { prompt } = require('inquirer');

let cf;
let s3;
let cfr;

//#############################################################################

/*
 * Globals
 */
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

/*
 * References
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab2c15c15c17c11
 *
 */
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

const error_states = [
  'CREATE_FAILED',
  'DELETE_FAILED',
  'UPDATE_FAILED',
  'ROLLBACK_FAILED',
  'UPDATE_ROLLBACK_FAILED',
  'UPDATE_ROLLBACK_IN_PROGRESS',
  'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS'
];

const paths = {
  base: path.resolve(__dirname, '../'),
  ci_s3: 'ci/s3_cloudformation.cf',
  ci: 'ci/codebuild_capsule.cf',
  ci_project: 'ci/codebuild_project.cf',
  cf_templates: 'templates/child_templates/',
  web_template: 'templates/template.yaml',
  base_config: 'config/capsule_init_questions.json',
  ci_config: 'config/capsule_init_ci_questions.json',
  aws_url: 'https://s3.amazonaws.com/',
  output_config: 'capsule.json'
}

const projectParameters = {
  site_config_params: {},
  site_config_file: {},
  site_config: {}
}


let last_time = new Date(new Date() - 1000);


/**
 * Takes a JSON config file, opens its, reads the contents
 * passes it, and returns a JS object.
 *
 * @method getJsonFile
 *
 * @param {String} path
 *
 * @return {Object} data
 */
const getJsonFile = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    })
  });
}

/**
 * Pass in a config file in JSON format
 * process and return an object
 *
 * @method parseJsonConfig
 *
 * @param {String} site_config_file
 *
 * @return {Object}
 */
const parseJsonConfig = async (site_config_file) => getJsonFile(site_config_file);


/**
 *
 * Write config file out by taking the
 * JSOn object and stringifying it
 *
 * @method writeConfigFile
 *
 * @param {Object} answers
 *
 * @return {void}
 */
const writeConfigFile = (answers) => {
  fs.writeFile(paths.output_config, JSON.stringify(answers), function(err) {
    if(err) {
      logIfVerbose(`${err}`);
    }
  });
}

commander
  .version(module.exports.version)
  .option('-v, --verbose', 'verbose output')

//TODO - move code for assigning vars into a separate function
//to allow code re-use.
commander
  .command('init')
  .description('Define the project parameters')
  .action(async function (options) {
    commander.type = 'init'
    const generic_questions = await parseJsonConfig(path.resolve(paths.base, paths.base_config))
    const ci_questions = await parseJsonConfig(path.resolve(paths.base, paths.ci_config))
    console.log("Executing project initialization")
    let combined_answers = {}
    await prompt(generic_questions).then(answers => {
      combined_answers = answers
    });
    await prompt(ci_questions).then(answers => {
       combined_answers.ci = answers
    });
    writeConfigFile(combined_answers)
  });


commander
  .command('deploy')
  .description('Builds out the web hosting infrastructure in one go')
  .action(function (options) {
    console.log("Executing project deployment")
    commander.type = options._name || undefined
  });

commander
  .command('remove')
  .description('Removes the whole of the web hosting infrastructure, including files in S3 buckets')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .action(function (options) {
    console.log("Executing project removal")
    commander.type = options._name || undefined
    commander.projectName = options.projectName || undefined
    commander.config = options.config || undefined
    commander.awsProfile = options.awsProfile || undefined
    commander.dom = options.dom || undefined
    commander.subdom = options.subdom || undefined
  });

// The following commands are the mroe granular ones, that allow step by step deployment
// of the web hosting infrastructure
commander
  .command('create <type>')
  .description('Initializes the s3 bucket required to store nested stack templates takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .option('-u, --url <repo>', 'The source control URL to use')
  .option('-sc, --site_config <site-config>', 'A JSON object contianing site configuration, overrides values defined in site config file')
  .option('-scf, --site_config_file <site-config-path>', 'Custom configuration file used in CodeBuild for building the static site')
  .action(function (type, options) {
    console.log("Executing create for: "+type)
    commander.type = options._name || undefined
    commander.projectName = options.projectName || undefined
    commander.config = options.config || undefined
    commander.awsProfile = options.awsProfile || undefined
    commander.dom = options.dom || undefined
    commander.subdom = options.subdom || undefined
    commander.url = options.url || undefined
    commander.site_config = options.site_config || {}
    commander.site_config_file = options.site_config_file || undefined
  });

commander
  .command('update <type>')
  .description('Updates the templates into the s3 bucket and runs the nested stack takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .option('-u, --url <repo>', 'The source control URL to use')
  .option('-sc, --site_config <site-config>', 'A JSON object contianing site configuration, overrides values defined in site config file')
  .option('-scf, --site_config_file <site-config-path>', 'Custom configuration file used in CodeBuild for building the static site')
  .action(function (type, options) {
    console.log("Executing update for: "+type)
    commander.type = options._name || undefined
    commander.projectName = options.projectName || undefined
    commander.config = options.config || undefined
    commander.awsProfile = options.awsProfile || undefined
    commander.dom = options.dom || undefined
    commander.subdom = options.subdom || undefined
    commander.url = options.url || undefined
    commander.site_config = options.site_config || {}
    commander.site_config_file = options.site_config_file || undefined
  });

commander
  .command('delete <type>')
  .description('Deletes the s3 bucket contents takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .action(function (type, options) {
    console.log("Executing delete for: "+type)
    commander.type = options._name || undefined
    commander.projectName = options.projectName || undefined
    commander.config = options.config || undefined
    commander.awsProfile = options.awsProfile || undefined
    commander.dom = options.dom || undefined
    commander.subdom = options.subdom || undefined
  });


commander.parse(process.argv);


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

const getRandomToken = () => Math.floor(Math.random() * 89999) + 10000;

// File Helpers ###############################################################



/**
 * TODO: This may require to get it from github directly to avoid packing it
 *
 * @method getTemplateBody
 *
 * @param {String} path
 *
 * @return {String} data
 */
const getTemplateBody = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}


/**
 * get the S3 file
 * then re-use the existing functions to
 * build the stack
 *
 * @method getCiS3Template
 *
 * @param {String}
 *
 * @return {String}
 */
const getCiS3Template = () => getTemplateBody(path.resolve(paths.base, paths.ci_s3));

/**
 * Get the codebuild file
 * then re-use the existing functions to
 * build the stack.
 *
 * By default we use the ci_project path.
 *
 * TODO: Add in a flag to use the capsule CodeBuild file
 * or make the path a parameter that defaults to ci_project.
 *
 * @method getCiTemplate
 *
 * @param {String}
 *
 * @return {String}
 */
const getCiTemplate = () => getTemplateBody(path.resolve(paths.base, paths.ci_project));

/**
 * Get the template.yml file
 * then re-use the existing functions to
 * build the stack
 *
 * @method getWebTemplate
 *
 * @param {String}
 *
 * @return {String}
 */
const getWebTemplate = async () => getTemplateBody(path.resolve(paths.base, paths.web_template));


// AWS Helpers ################################################################

/**
 * Environment variables should have higher precedence
 * Load the aws libraries with authentication already set
 *
 * Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
 * Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
 * Reference: https://github.com/aws/aws-sdk-js/pull/1391
 * Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-json-file.html
 *
 * @method loadAWSConfiguration
 *
 * @param {String} config_path
 * @param {Object} aws_profile
 *
 * @return {void}
 *
 */
const loadAWSConfiguration = async (config_path, aws_profile) => {
  if ((AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) || AWS_PROFILE) {
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials();
  } if (aws_profile) {
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials({profile: aws_profile});
  } else if (config_path) {
    aws.config.loadFromPath(config_path);
  } else {
    process.env.AWS_SDK_LOAD_CONFIG = '1';
    aws.config.credentials = new aws.SharedIniFileCredentials();
  }

  cf = new aws.CloudFormation();
  s3 = new aws.S3();
  cfr = new aws.CloudFront()
}

// AWS CF Helpers #############################################################

/**
 * Given the cloud formation stack state, it returns the color red if it is a
 * failure state, green if it is a success state, and yellow otherwise.
 *
 * @method getStackEventColor
 *
 * @param {String} state
 *
 * @return {String} color
 */
const getStackEventColor = (state) => {
  switch (true) {
    case error_states.includes(state): return 'red';
    case stack_states.includes(state): return 'green';
    default: return 'yellow';
  }
}

/**
 * Given the cloud formation stack event, it returns a string with a single
 * line description for it.
 *
 * @method getStackEventColor
 *
 * @param {String} event
 *
 * @return {String} output_line
 */
const printStackEventOutputLine = (e) => {
  let time = `${e.Timestamp.toLocaleString()}`;
  let status = `${chalk[getStackEventColor(e.ResourceStatus)](e.ResourceStatus)}`;
  let resource = `${e.ResourceType}`;
  let id = `${e.PhysicalResourceId}`;
  console.log(`${time} ${status} ${resource} ${id}`);
}

/**
 * Given an object of key->value, it will return the list of parameters in the
 * format expected by AWS.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
 *
 * @method getFormattedParameters
 *
 * @param {Object} parameters
 *
 * @return {Object} formated_parameters
 */
const getFormattedParameters = (parameters) => {
  let formated_parameters = [];
  for (let p in parameters) {
    formated_parameters.push({
      ParameterKey: p,
      ParameterValue: parameters[p]
    });
  }
  return formated_parameters;
}

/**
 * Given the name of the stack, a string with the template body to apply, an
 * object with the stack parameters, and a token, it starts the CF stack
 * creation request identifed by the token.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
 *
 * @method createCFStack
 *
 * @param {String} name
 * @param {String} template_body
 * @param {Object} parameters
 * @param {Object} token
 *
 * @return {Object}
 *
 */
const createCFStack = async (name, template_body, parameters, token) => {
  return new Promise((resolve, reject) => {
    cf.createStack({
      StackName: name,
      ClientRequestToken: token,
      Parameters: getFormattedParameters(parameters),
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

/**
 * Given the name of the stack, a string with the template body to apply, an
 * object with the stack parameters, and a token, it starts the CF stack
 * update request identifed by the token.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
 *
 * @method updateCFStack
 *
 * @param {String} name
 * @param {String} template_body
 * @param {Object} parameters
 * @param {Object} token
 *
 * @return {Object}
 *
 */
const updateCFStack = async (name, template_body, parameters, token) => {
  return new Promise((resolve, reject) => {
    cf.updateStack({
      StackName: name,
      ClientRequestToken: token,
      Parameters: getFormattedParameters(parameters),
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

/**
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStackEvents-property
 *
 * @method describeStack
 *
 * @param {String} StackName
 *
 * @return {Object} data
 *
 */
const describeStack = async (StackName) => {
  return new Promise((resolve, reject) => {
    cf.describeStacks({ StackName }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * Given the id and name of the stack,and a token, it starts the CF stack
 * delete request identifed by the token.
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#deleteStack-property
 *
 * @method deleteCFStack
 *
 * @param {String} id
 * @param {String} name
 * @param {Object} token
 *
 * @return {Object} data
 *
 */
const deleteCFStack = async (id, name, token) => {
  return new Promise((resolve, reject) => {
    cf.deleteStack({
      StackName: id,
      ClientRequestToken: token,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * Given the stack name it returns the stack details if exists, if not it
 * returns false.
 *
 * @method getStackIfExists
 *
 * @param {String} name
 *
 * @return {Boolean}
 * @return {Object} Stack
 */
const getStackIfExists = async (name) => {
  try {
    let { Stacks } = await describeStack(name);
    return Stacks[0];
  } catch (e) {
    logIfVerbose(e.message, true);
    if (e.message.match("(.*)" + name + "(.*)does not exist(.*)")) {
      return false;
    }
    throw e;
  }
}

/**
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStackEvents-property
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-listing-event-history.html
 *
 * @method getNextStackEvent
 *
 * @param {String} id
 * @param {Object} next
 *
 * @return {Object} data
 *
 */
const getNextStackEvent = async (id, next) => {
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

/**
 * Given the Stack id, it returns the list of events of the stack and nested
 * stacks.
 *
 * @method getStackEvents
 *
 * @param {String} id
 *
 * @return {Array} list
 */
const getStackEvents = async (id) => {
  let response = await getNextStackEvent(id);
  let events = response.StackEvents;

  while (typeof response.NextToken !== 'undefined') {
    response = await getNextStackEvent(id, response.NextToken);
    events.concat(response.StackEvents);
  }

  let nestedStackIds = events.reduce((list, e) => {
    let physical_resource_id = e.PhysicalResourceId;
    if (e.ResourceType === 'AWS::CloudFormation::Stack' &&
        physical_resource_id != '' &&
        e.StackId != physical_resource_id &&
        !list.includes(physical_resource_id)) {
      list.push(physical_resource_id);
    }
    return list;
  }, []);

  for (id of nestedStackIds) events.concat(await getStackEvents(id));
  return events.sort((e1, e2) => e1.Timestamp - e2.Timestamp);
};

/**
 * Given the stack id and the token that identifies the stack change request,
 * it prints the events filtered by the id and the token, and it ensures the
 * events are always new.
 * The monitoring will finish when an event with status is one of the final
 * status from AWS.
 * See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab2c15c15c17c11
 *
 * @method monitorStackProgress
 *
 * @param {String} id
 * @param {Object} token
 *
 * @return {void}
 *
 */
const monitorStackProgress = async (id, token) => {
  let in_progress = true;
  let events_seen = []
  let spinner = new Spinner();
  spinner.setSpinnerDelay(6);
  spinner.setSpinnerString('|/-\\');
  logIfVerbose(`Start monitoring stack ${id}`);
  spinner.start();
  while (in_progress) {
    let events;
    try {
      events = await getStackEvents(id);
    } catch (e) {
      logIfVerbose(`Can't get stack events: ${e}`);
    }

    if (events === undefined) {
      logIfVerbose(`No new Events: In progress`);
      continue;
    }

    for (e of events) {
      if (e.Timestamp < last_time ||
          events_seen.includes(e.EventId) ||
          (token && e.ClientRequestToken !== token)) {
        logIfVerbose(`Event ignored: ${e.EventId}`);
      } else {
        logIfVerbose(`NEW Event: ${e}`);
        printStackEventOutputLine(e);
        events_seen.push(e.EventId);
      }
      if (e.ResourceType === 'AWS::CloudFormation::Stack' &&
          e.StackId === id && e.PhysicalResourceId === id &&
          stack_states.includes(e.ResourceStatus) &&
          (!token || token && e.ClientRequestToken === token ) &&
          e.Timestamp > last_time)
      {
        in_progress = false;
      }
      last_time = e.Timestamp;
    }
    await delay(1000);
  }
  spinner.stop();
  process.stdout.write('\n');
  logIfVerbose(`End monitoring stack ${id} with token ${token}`);
}

/**
 * Given the stack name, the stack template in string format, and its
 * parameters. It creates the stack and monitors it by polling for the stack
 * events and printing it in stdout.
 * When creating the initial S3 bucket to store the CF templates, it uses the
 * s3_cloudformation.cf templates from the local file system.
 * When building out the stack where the static website will be hosted
 * it uses the bucket created from the s3_cloudformation.cf file, and looks
 * in this for the template.yml file.
 *
 * @method createStack
 *
 * @param {String} name
 * @param {String} templateBody
 * @param {Object} parameters
 *
 * @return {void}
 */
const createStack = async (name, templateBody, parameters) => {
  let token = `${name}-create-` + getRandomToken();
  let { StackId } = await createCFStack(name, templateBody, parameters, token);
  await monitorStackProgress(StackId, token);
}

/**
 * Given the stack name, the stack template in string format, and its
 * parameters. It updates the stack and monitors it by polling for the stack
 * events and printing it in stdout.
 *
 * @method updateStack
 *
 * @param {String} name
 * @param {String} templateBody
 * @param {Object} parameters
 *
 * @return {void}
 */
const updateStack = async (name, templateBody, parameters) => {
  let stack = await getStackIfExists(name);
  if (stack.StackId) {
    let StackId = stack.StackId;
    let token = `${name}-update-` + getRandomToken();
    await updateCFStack(name, templateBody, parameters, token);
    await monitorStackProgress(StackId, token);
  }
}

/**
 * Given the stack name, it deletes the stack and monitors it by polling for
 * the stack events and printing it in stdout.
 *
 * @method deleteStack
 *
 * @param {String} name
 *
 * @return {void}
 */
const deleteStack = async (name) => {
  let { StackId } = await getStackIfExists(name);
  if (StackId) {
    let token = `${name}-delete-` + getRandomToken();
    await deleteCFStack(StackId, name, token);
    await monitorStackProgress(StackId, token);
  }
}

// AWS S3 Helpers #############################################################

/**
 * List the files in an S3 bucket.
 *
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
 *
 * @method listS3BucketObjects
 *
 * @param {String} name
 *
 * @return {void}
 */
const listS3BucketObjects = async (name) => {
  return new Promise((resolve, reject) => {
    s3.listObjectsV2({
      Bucket: name
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * Given an s3 bucket, it removes all its content. This is required by CF in
 * order to remove an s3 bucket.
 * Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
 *
 * @method clearS3Bucket
 *
 * @param {String} name
 *
 * @return {Object} Objects
 * @return {Object} data
 */
const clearS3Bucket = async (name) => {
  try {
    let { Contents } = await listS3BucketObjects(name);
    if (Contents.length) {
      let Objects = Contents.map( obj => {
        return { Key : obj.Key };
      });
      return new Promise((resolve, reject) => {
        s3.deleteObjects({
          Bucket: name,
          Delete: { Objects }
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    }
  } catch (e) {
    logIfVerbose(e.message, true);
    if (e.message.match("(.*)does not exist(.*)")) return;
    throw e;
  }
}

/**
 * Given the name of the project, it creates the s3 bucket used for storing the
 * CF templates for nested CF Stacks.
 *
 * @method createS3Bucket
 *
 * @param {String} projectName
 *
 * @return {void}
 */
const createS3Bucket = async (projectName) => {
  await createStack(
    projectName,
    await getCiS3Template(),
    { ProjectName : projectName }
  );
}

/**
 * Given the name of the project, it updates the s3 bucket used for storing the
 * CF templates for nested CF Stacks. Given that the bucket may require to be
 * re-created, it will clean the bucket.
 *
 * @method updateS3Bucket
 *
 * @param {String} projectName
 * @param {String} bucketName
 *
 * @return {void}
 */
const updateS3Bucket = async (projectName, bucketName) => {
  await clearS3Bucket(bucketName);
  await updateStack(
    projectName,
    await getCiS3Template(),
    { ProjectName : projectName }
  );
}

/**
 * Given the name of the project, it removes the CF templates stored in the s3
 * bucket used for the CI. And finally removes the CI s3 bucket.
 *
 * @method deleteS3Bucket
 *
 * @param {String} projectName
 * @param {String} bucketName
 *
 * @return {void}
 */
const deleteS3Bucket = async (projectName, bucketName) => {
  await clearS3Bucket(bucketName);
  await deleteStack(projectName);
}

/**
 * A method to add files to an S3 bucket
 *
 * @method addFilesToS3Bucket
 *
 * @param {String} projectName
 * @param {String} bucketName
 *
 * @return {void}
 */
const addFilesToS3Bucket = async (projectName, bucketName) => {
  const templates_path = path.resolve(paths.base, paths.cf_templates)
  fs.readdir(templates_path, (err, files) => {
    if(!files || files.length === 0) {
      logIfVerbose(`Templates folder is missing`);
      return;
    }
    for (const file of files) {
      const file_path = path.join(templates_path, file);
      if (fs.lstatSync(file_path).isDirectory()) {
        continue;
      }
      fs.readFile(file_path, (error, file_content) => {
        if (error) {
          throw error;
        }
        s3.putObject({
          Bucket: bucketName,
          Key: file,
          Body: file_content
        }, (res) => {
          logIfVerbose(`Successfully uploaded '${file}' to '${bucketName}' for project '${projectName}' !`);
        });
      });
    }
  });
}

/**
 * Get the CloudFront distribution ID
 * and return the value
 *
 * @method getCloudFrontDistID
 *
 * @param {String} bucketName
 *
 * @return {String} distId
 *
 */
const getCloudFrontDistID = async (bucketName) => {
  return new Promise((resolve, reject) => {
    cfr.listDistributions({}, function(err, data) {
      if (err) {
        logIfVerbose(`${err} , ${err.stack}`);
        reject(err)
      } else {
        resolve(extractDistId(data, bucketName));
      }
    });
  })
}

/**
 * Search through object and get id
 * of CloudFront distribtuion associated
 * with the S3 bucket.
 *
 * @method extractDistId
 *
 * @param {Object} data
 * @param {String} bucketName
 *
 * @return {String} distId
 *
 */
const extractDistId = (data, bucketName) => {
  return new Promise((resolve, reject) => {
    for(var i in data.DistributionList.Items) {
      for ( var id in data.DistributionList.Items[i].Origins.Items) {
        if(data.DistributionList.Items[i].Origins.Items[id].Id === bucketName) {
          resolve(data.DistributionList.Items[i].Id)
        }
      }
    }
    reject(undefined)
  });
}

/**
 * Given the name of the project where the cf templates are stored,
 * grab the scripts from the s3 bucket with that name and spin
 * up the web infrastructure.
 *
 * TODO: paramters should be passed through as a single object for
 * createStack.
 *
 * @method createWebStack
 *
 * @param {String} s3BucketName
 * @param {String} webProjectName
 * @param {String} subdomain
 * @param {String} domain
 *
 * @return {void}
 */
const createWebStack = async (s3BucketName, webProjectName, subdomain, domain) => {
  await createStack(
    webProjectName,
    await getWebTemplate(),
    {
      TemplatesDirectoryUrl : paths.aws_url+s3BucketName,
      Domain: domain,
      Subdomain: subdomain
    }
  );
}

/**
 * Given the name of the project, it updates the target projects stack
 * and updates it..
 *
 * TODO: paramters should be passed through as a single object for
 * createStack.
 *
 * @method updateWebStack
 *
 * @param {String} webProjectName
 *
 * @return {void}
 */
const updateWebStack = async (s3BucketName, webProjectName,subdomain, domain) => {
  await updateStack(
    webProjectName,
    await getWebTemplate(),
    {
      TemplatesDirectoryUrl : paths.aws_url+s3BucketName,
      Domain: domain,
      Subdomain: subdomain
    }
  );
}


/**
 * Given the name of the project, it removes the web stack.
 *
 * @method deleteWebStack
 *
 * @param {String} webProjectName
 *
 * @return {void}
 */
const deleteWebStack = async (webProjectName) => {
  await deleteStack(webProjectName);
}


/**
 * Given the name of the project, it runs the codebuild
 * template which in turn checks the code out from
 * the repository, install, tests and buulds it
 * Finally the code is pushed to the S3 bucket defined by
 * the subdomain and domain.
 *
 * @method createCiStack
 *
 * @param {String} ciprojectName
 * @param {Object} site_config
 *
 * @return {void}
 */
const createCiStack = async (ciprojectName, site_config) => {
  await createStack(
    ciprojectName,
    await getCiTemplate(),
    site_config
  );
}

/**
 * Given the name of the project, it updates the target projects stack
 * CF templates for codebuild.
 *
 * @method updateCiStack
 *
 * @param {String} ciprojectName
 *
 * @return {void}
 */
const updateCiStack = async (ciprojectName, site_config) => {
  await updateStack(
    ciprojectName,
    await getCiTemplate(),
    site_config
  );
}

/**
 * Given the name of the project, it removes the CI process. .
 *
 * @method deleteCiStack
 *
 * @param {String} ciprojectName
 *
 * @return {void}
 */
const deleteCiStack = async (ciprojectName, bucketName) => {
  await clearS3Bucket(bucketName);
  await deleteStack(ciprojectName);
}


/**
 * Handle S3 bucket commands.
 * The S3 bucket contains the CF templates
 * that are used by the web commands to
 * built out the static hosting site.
 *
 * @method s3Cmnds
 *
 * @return {void}
 */
const s3Cmds = async(type) => {

  const projectName = projectParameters.site_config['ProjectName']
  const bucketName = projectParameters.site_config['S3BucketName']

  if (type === 'create') {
    await createS3Bucket(projectName);
    logIfVerbose(`Uploading files....`);
    await addFilesToS3Bucket(projectName, bucketName)
  }

  if (type === 'update') {
    await updateS3Bucket(projectName, bucketName);
  }

  if (type === 'delete') {
    await deleteS3Bucket(projectName, bucketName);
  }
}

/**
 * Handle web commands.
 * These take the CF scripts from the S3 bucket
 * and spin up the web hosting infrastructure
 * for the static site.
 *
 * @method webCmds
 *
 * @param {String} cmd
 *
 * @return {void}
 */
const webCmds = async(type) => {
  const s3BucketName = projectParameters.site_config['S3BucketName']
  const webProjectName = projectParameters.site_config['WebProjectName']
  const subDomain = projectParameters.site_config['SubDomain']
  const domain = projectParameters.site_config['Domain']

  if(!domain) {
    printErrorAndDie('Website domain name is required!', true);
  }

  if (type === 'create') {
    await createWebStack(s3BucketName, webProjectName, subDomain, domain);
  }

  if (type === 'update') {
    await updateWebStack(s3BucketName, webProjectName, subDomain, domain);
  }

  if (type === 'delete') {
    await deleteWebStack(webProjectName);
  }
}

/**
 * Handle continuous integration stack build out
 * This allows you to use CloudBuild to pull code from
 * a repository and dump it into the S3 bucket.
 *
 * @method cliCmds
 *
 * @param {String} cmd
 *
 * @return {void}
 */
const ciCmds = async(type) => {
  const ciprojectName = projectParameters.site_config.ci['CodeBuildProjectCodeName']
  const webBucketName = projectParameters.site_config['ProjectS3Bucket']
  let site_config = projectParameters.site_config.ci
  site_config['ProjectS3Bucket'] = webBucketName

  if (type === 'create' || type === 'update') {
    site_config['CloudDistId'] = await getCloudFrontDistID(webBucketName)
  }

  if (type === 'create') {
    await createCiStack(ciprojectName, site_config);
  }

  if (type === 'update') {
    await updateCiStack(ciprojectName, site_config);
  }

  if (type === 'delete') {
    await deleteCiStack(ciprojectName, webBucketName);
  }
}



/**
 * Merges together the values from the site_config.json file
 * (or whatever named file the user specified) with any values
 * passed in from the command line as part of the sc flag.
 *
 * @method mergeConfig
 *
 *
 * @return {Object}
 *
 */
const mergeConfig = async () => {
  let config_params = projectParameters.site_config_params
  let file_params = {}
  let merged_params = {}
  if(projectParameters.site_config_file !== undefined) {
    file_params = await parseJsonConfig(projectParameters.site_config_file)
  }
  if (typeof config_params === "string") {
    config_params = JSON.parse(config_params)
  } else if (config_params === undefined) {
    config_params = {}
  }
  return Object.assign({}, file_params, config_params);
}



/**
 * Config global variables used to confiure the project
 * We start by reading in the capsule.json file.
 * Following this, any overrides passed in via the
 * --site_config flag are merged in and take precedent.
 * The final step is to then check if any named flags are
 * also passed in e.g. --project-name.
 * If so these takes precedent over the configuration in the
 * file and the config in the --site_config.
 *
 * Once complete the projectParameters object contains
 * all of the key/value pairs we need in order to
 * populate the CF scripts.
 *
 * @method{processConfiguration}
 *
 * @return {void}
 *
 */
const processConfiguration = async () => {

  projectParameters.site_config_params = commander.site_config //commandline JSON object
  projectParameters.site_config_file = commander.site_config_file ? commander.site_config_file : "capsule.json"
  projectParameters.site_config = await mergeConfig()

  if(commander.projectName !== undefined) {
    projectParameters.site_config['ProjectName'] = commander.projectName
  }

  projectParameters.site_config['S3BucketName'] = `cf-${projectParameters.site_config['ProjectName']}-capsule-ci`
  projectParameters.site_config.ci['CodeBuildProjectCodeName'] = `capsule-${projectParameters.site_config['ProjectName']}-ci`
  projectParameters.site_config['WebProjectName'] = `capsule-${projectParameters.site_config['ProjectName']}-web`

  if(commander.url !== undefined) {
    projectParameters.site_config['RepositoryURL'] = commander.url
  }

  if(commander.dom !== undefined) {
    projectParameters.site_config['Domain']  = commander.dom
  }

  if(commander.subdom !== undefined) {
    projectParameters.site_config['SubDomain']  = commander.subdom
  }

  projectParameters.site_config['ProjectS3Bucket'] = projectParameters.site_config['SubDomain'] ? `${projectParameters.site_config['SubDomain']}.${projectParameters.site_config['Domain']}` : projectParameters.site_config['Domain'];
}

// MAIN #######################################################################
(async () => {
  global.cwd = process.cwd();
  const type = commander.type;

  await loadAWSConfiguration(commander.config, commander.awsProfile);

  if (commander.type !== 'init') {
    await processConfiguration()
  }

  if (commander.type === 'deploy') {
    const deployType = 'create'
    await s3Cmds(deployType)
    await webCmds(deployType)
    await ciCmds(deployType)
  }

  if (commander.type === 'remove') {
    const deleteType = 'delete'
    await ciCmds(deleteType)
    await webCmds(deleteType)
    await s3Cmds(deleteType)
  }

  if (commander.args.includes('s3')) {
    await s3Cmds(type)
  }

  if (commander.args.includes('web')) {
    await webCmds(type)
  }

  if (commander.args.includes('ci')) {
    await ciCmds(type)
  }

})();

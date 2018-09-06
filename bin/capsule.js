#!/usr/bin/env node
//#############################################################################
// @licence: MIT
// @description: Automated CLI for Static web application hosting on AWS
//#############################################################################

const fs = require('fs');
const commander = require('commander');
const chalk = require('chalk');
const aws = require('aws-sdk');
const path = require('path')
let cf;
let s3;

//#############################################################################

commander
  .version('0.0.1')
  .option('-v, --verbose', 'verbose output')

commander
  .command('create <type>')
  .description('Initializes the s3 bucket required to store nested stack templates takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .option('-u, --url <repo>', 'The source control URL to use')
  .action(function (type, options) {
          console.log("Executing create for: "+type)
          commander.type = options._name || undefined
          commander.projectName = options.projectName || undefined
          commander.config = options.config || undefined
          commander.awsProfile = options.awsProfile || undefined
          commander.dom = options.dom || undefined
          commander.subdom = options.subdom || undefined
          commander.url = options.url || undefined
   });

commander
  .command('update <type>')
  .description('Updates the templates into the s3 bucket and runs the nested stack takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .action(function (type, options) {
          console.log("Executing update for: "+type)
          commander.type = options._name || undefined
          commander.projectName = options.projectName || undefined
          commander.config = options.config || undefined
          commander.awsProfile = options.awsProfile || undefined
          commander.dom = options.dom || undefined
          commander.subdom = options.subdom || undefined
   });

commander
  .command('delete <type>')
  .description('Deletes the s3 bucket contents takes: s3, ci or web')
  .option('-n, --project-name <project-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-d, --dom <dom>', 'The name of the static website domain being created from the cf templates')
  .option('-s, --subdom <subdom>', 'The name of the static website subdomain being created from the cf templates')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .option('-d, --remove-cf-bucket', 'Remove the bucket used for storing the nested templates')
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

const paths = {
  base: `${__dirname}/../`,
  ci_s3: 'ci/s3_cloudformation.cf',
  ci: 'ci/codebuild_capsule.cf',
  cf_templates: 'templates/child_templates/',
  web_template: 'templates/template.yaml',
  aws_url: 'https://s3.amazonaws.com/'
}

let last_time = new Date(new Date() - 1000);

/*
 * Helpers
 *
 */
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

// File Helpers ##############################################################

/*
 * getTemplateBody
 * TODO: This may require to get it from github directly to avoid packing it
 */
const getTemplateBody = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

const getCiS3Template = () => getTemplateBody(`${paths.base}/${paths.ci_s3}`);

/*
 * getCiTemplate:
 * get the codebuild file
 * then re-use the existing functions to
 * build the stack
 *
 */
const getCiTemplate = () => getTemplateBody(`${paths.base}/${paths.ci}`);

/*
 * getWebTemplate:
 * get the template.yml file
 * then re-use the existing functions to
 * build the stack
 *
 */
const getWebTemplate = async () => getTemplateBody(`${paths.base}/${paths.web_template}`);


// AWS Helpers ################################################################

/*
 * loadAWSConfiguration:
 * Environment variables should have higher precedence
 * Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
 */
const loadAWSConfiguration = async (config_path, aws_profile) => {
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

  // Load the aws libraries with authentication already set
  cf = new aws.CloudFormation();
  s3 = new aws.S3();
}

// AWS CF Helpers #############################################################

/*
 * getFormattedParameters:
 *
 * Given an object of key->value, it will return the list of parameters in the
 * format expected by AWS.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
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

/*
 * createCFStack:
 * Given the name of the stack, a string with the template body to apply, an
 * object with the stack parameters, and a token, it starts the CF stack
 * creation request identifed by the token.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
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

/*
 * updateCFStack:
 * Given the name of the stack, a string with the template body to apply, an
 * object with the stack parameters, and a token, it starts the CF stack
 * update request identifed by the token.
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
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

/*
 * describeStack
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStackEvents-property
 */
const describeStack = async (StackName) => {
  return new Promise((resolve, reject) => {
    cf.describeStacks({ StackName }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/*
 * deleteCFStack:
 * Given the id and name of the stack,and a token, it starts the CF stack
 * delete request identifed by the token.
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#deleteStack-property
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

/*
 * getStackIfExists:
 * Given the stack name it returns the stack details if exists, if not it
 * returns false.
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

/*
 * getNextStackEvent
 * References:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStackEvents-property
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-listing-event-history.html
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

/*
 * getStackEvents:
 * Given the Stack id, it returns the list of events of the stack and nested
 * stacks.
 */
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

/*
 * Given the stack id and the token that identifies the stack change request,
 * it prints the events filtered by the id and the token, and it ensures the
 * events are always new.
 * The monitoring will finish when an event with status is one of the final
 * status from AWS.
 * See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab2c15c15c17c11
 */
const monitorStackProgress = async (id, token) => {
  let in_progress = true;
  let events_seen = []
  logIfVerbose(`Start monitoring stack ${id}`);
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
    if (in_progress) {
      await delay(1000);
    }
  }
  logIfVerbose(`End monitoring stack ${id} with token ${token}`);
}

/*
 * createStack:
 * Given the stack name, the stack template in string format, and its
 * parameters. It creates the stack and monitors it by polling for the stack
 * events and printing it in stdout.
 * When creating the initial S3 bucket to store the CF templates, it uses the
 * s3_cloudformation.cf templates from the local file system.
 * When building out the stack where the static website will be hosted
 * it uses the bucket created from the s3_cloudformation.cf file, and looks
 * in this for the template.yml file.
 */
const createStack = async (name, templateBody, parameters) => {
  let token = `${name}-create-` + getRandomToken();
  let { StackId } = await createCFStack(name, templateBody, parameters, token);
  await monitorStackProgress(StackId, token);
}

/*
 * updateStack:
 * Given the stack name, the stack template in string format, and its
 * parameters. It updates the stack and monitors it by polling for the stack
 * events and printing it in stdout.
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

/*
 * deleteStack:
 * Given the stack name, it deletes the stack and monitors it by polling for
 * the stack events and printing it in stdout.
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

/*
 * listS3BucketObjects
 * Reference:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
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

/*
 * clearS3Bucket:
 * Given an s3 bucket, it removes all its content. This is required by CF in
 * order to remove an s3 bucket.
 * Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
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

/*
 * createS3Bucket:
 * Given the name of the project, it creates the s3 bucket used for storing the
 * CF templates for nested CF Stacks.
 */
const createS3Bucket = async (projectName) => {
  await createStack(
    projectName,
    await getCiS3Template(),
    { ProjectName : projectName }
  );
}

/*
 * updateS3Bucket:
 * Given the name of the project, it updates the s3 bucket used for storing the
 * CF templates for nested CF Stacks. Given that the bucket may require to be
 * re-created, it will clean the bucket.
 */
const updateS3Bucket = async (projectName, bucketName) => {
  await clearS3Bucket(bucketName);
  await updateStack(
    projectName,
    await getCiS3Template(),
    { ProjectName : projectName }
  );
}

/*
 * deleteS3Bucket:
 * Given the name of the project, it removes the CF templates stored in the s3
 * bucket used for the CI. And finally removes the CI s3 bucket.
 */
const deleteS3Bucket = async (projectName, bucketName) => {
  await clearS3Bucket(bucketName);
  await deleteStack(projectName);
}

/*
 * addFilesToS3Bucket:
 *
 */
const addFilesToS3Bucket = async (projectName, bucketName) => {
  const templates_path = `${paths.base}/${paths.cf_templates}`
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
        if (error) { throw error; }
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

/*
 * createWebStack:
 * Given the name of the project where the cf templates are stired,
 * it grabs the scripts from
 * the s3 bucket with that name and spins up the web infrastructure
 */
const createWebStack = async (s3projectName, webProjectName, subdomain, domain) => {
  await createStack(
    webProjectName,
    await getWebTemplate(),
    {
        TemplatesDirectoryUrl : paths.aws_url+s3projectName,
        Domain: domain,
        Subdomain: subdomain
    }
  );
}

/*
 * updateWebStack:
 * Given the name of the project, it updates the target projects stack
 * and updates it..
 */
const updateWebStack = async (name) => {
}


/*
 * deleteWebStack:
 * Given the name of the project, it removes the web stack.
 */
const deleteWebStack = async (webProjectName) => {
  await deleteStack(webProjectName);
}



/*
 * createCiStack:
 * Given the name of the project, it runs the codebuild
 * template which in turn checks the code out from
 * the repository, install, tests and buulds it
 * Finally the code is pushed to the S3 bucklet defined by
 * the subdomain and domain.
 */
const createCiStack = async (ciprojectName, url, subdomain, domain) => {
  await createStack(
    ciprojectName,
    await getCiTemplate(),
    {
        CodeBuildProjectCodeName: ciprojectName,
        RepositoryURL: url
    }
  );
}

/*
 * updateCiStack:
 * Given the name of the project, it updates the target projects stack
 * CF templates for codebuild.
 */
const updateCiStack = async (name) => {
}


/*
 * deleteCiStack:
 * Given the name of the project, it removes the CI process. .
 */
const deleteCiStack = async (ciprojectName) => {
  await deleteStack(ciprojectName);
}

/*
 * s3Cmnds:
 * Handle S3 bucket commands.
 * The S3 bucket contains the CF templates
 * that are used by the web commands to
 * built out the static hosting site.
 *
 */
const s3Cmds = async() => {

  let projectName = commander.projectName
  let bucketName = `cf-${projectName}-capsule-ci`

  if (commander.type === 'create') {
    await createS3Bucket(projectName);
    logIfVerbose(`Uploading files....`);
    await addFilesToS3Bucket(projectName, bucketName)
  }

  if (commander.type === 'update') {
    await updateS3Bucket(projectName, bucketName);
  }

  if (commander.type === 'delete') {
    await deleteS3Bucket(projectName, bucketName);
  }
}

/*
 * webCmds:
 * Handle web commands.
 * These take the CF scripts from the S3 bucket
 * and spin up the web hosting infrastructure
 * for the static site.
 *
 */
const webCmds = async(cmd) => {
  let s3projectName = commander.projectName
  let webProjectName = "capsule-"+s3projectName+"-web"
  s3projectName = "cf-"+s3projectName+"-capsule-ci"

  if(!commander.dom) {
    printErrorAndDie('Website domain name is required!', true);
  }

  if (commander.type === 'create') {
    await createWebStack(s3projectName, webProjectName, commander.subdom, commander.dom);
  }

  if (commander.type === 'update') {
    await updateWebStack(s3projectName, webProjectName);
  }

  if (commander.type === 'delete') {
    await deleteWebStack(webProjectName);
  }
}

/*
 * cliCmds:
 * Handle continuous integration stack build out
 * THis allows you to use CloudBuild to pull code from
 * a repository and dump it into the S3 bucket.
 *
 */
const ciCmds = async(cmd) => {
  let ciprojectName = "capsule-"+commander.projectName+"-ci"
  let url = commander.url

  if (commander.type === 'create') {
    await createCiStack(ciprojectName, url, commander.subdom, commander.dom);
  }

  if (commander.type === 'update') {
    await updateCiStack(ciprojectName);
  }

  if (commander.type === 'delete') {
    await deleteCiStack(ciprojectName);
  }
}

// MAIN #######################################################################
(async () => {

  global.cwd = process.cwd();

  await loadAWSConfiguration(commander.config, commander.awsProfile);

  if (!commander.projectName) {
     printErrorAndDie('Project name is required!', true);
  }

  if (commander.args.includes('s3')) {
     await s3Cmds()
  }

  if (commander.args.includes('ci')) {
     await ciCmds()
  }

  if (commander.args.includes('web')) {
     await webCmds()
  }

})();

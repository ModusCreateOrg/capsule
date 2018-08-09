#!/usr/bin/env node
//#############################################################################
// @licence: ?
// @description: Automated CLI for Static web application hosting on AWS
//#############################################################################

const commander = require('commander');
const chalk = require('chalk');
const aws = require('aws-sdk');

//#############################################################################

commander
  .version('0.0.1')
  .option('-i, --init <bucket-name>', 'Push cf templates to the s3 bucket, and creates it if it does not exist')
  .option('-c, --config <config-path>', 'Load the configuration from the specified path')
  .option('-p, --aws-profile <profile>', 'The AWS profile to use')
  .parse(process.argv);

// Globals ####################################################################

const {
  // AWS Access Key
  AWS_ACCESS_KEY_ID,
  // AWS secret key
  AWS_SECRET_ACCESS_KEY,
  // AWS profile name
  AWS_PROFILE,
} = process.env;

// Helpers ####################################################################

const logIfVerbose = (str, error) => {
  if (commander.verbose){
    if (error){
      console.error(str);
    }else{
      console.log(chalk.bgGreen(str));
    }
  }
}

const printError = (str) => {
  console.error(chalk.red(str));
}

const loadAWSConfiguration = async (config_path, aws_profile) => {
  // Environment variables should have higher precedence
  // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
  if ((AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) || AWS_PROFILE) {
    // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
    aws.config.credentials = new aws.SharedIniFileCredentials();
  } if (aws_profile) {
    aws.config.credentials = new aws.SharedIniFileCredentials({profile: aws_profile});
  } else if (config_path) {
    // Reference: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-json-file.html
    aws.config.loadFromPath(config_path);
  } else {
    aws.config.credentials = new aws.SharedIniFileCredentials();
  }
}

// MAIN #######################################################################

(async () => {
  global.cwd = process.cwd();
  await loadAWSConfiguration(commander.config, commander.awsProfile);
  if (commander.init){
    console.log("TODO: Initialize bucket and push files");
  } else {
    commander.help();
  }
})();

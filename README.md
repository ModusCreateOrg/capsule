# Capsule

[![MIT Licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ModusCreateOrg/capsule/blob/OAS-15_documentation/LICENSE)

Automated CLI for Static web application hosting on AWS

<p align="center">
    <img src="https://res.cloudinary.com/modus-labs/image/upload/f_auto,q_70,w_200/labs/logo-capsule.svg"
    width="150"
    alt="@modus/capsule">
</p>

## Introduction

The following README describes the CloudFormation templates based
project, for generating a static website hosted on Amazon S3.


## Templates

### Certificates - template.certificate.yaml

This file handles the certificate manager portion
of the CloudFormation configuration.

You can read more about AWS Certificate Manager here:

https://aws.amazon.com/certificate-manager/

### CloudFront Origin Access Identity - template.cfoai.yaml

The CFOAI template contains the configuration required
for CloudFront Origin Access Identity

### CloudFront - template.cloudfront.yaml

This file contains the list of parameters required by our
CloudFormation Stack including Error codes, HTTP versions and SSL supported method.

### Route 53 -  template.route53.yaml

Here you can find the Route 53 configuration for the static website
project.

https://aws.amazon.com/route53/


### S3 - template.s3.yaml

Amazon S3 bucket configuration can be found here.
The S3 bucket is where the static resources will be uploaded to and hosted
from.

https://aws.amazon.com/s3/

## Continuous Integration

The CI is currently using codebuild only. The cloudformation template [codebuild.cf](ci/codebuild.cf) allows to quickly setup a basic CI infrastructure for any repository.

### Requirements

The AWS codebuild service must be already authenticated with Github using oauth before creating the stack.

### How to use it?

From the CLI it can be used like:

```sh
aws cloudformation create-stack \
    --stack-name <your-stack-name> \
    --template-body file://<path-to-repo>/ci/codebuild.cf \
    --parameters ParameterKey=CodeBuildProjectCodeName,ParameterValue=<project-name> \
                 ParameterKey=RepositoryURL,ParameterValue=<https-clone-url> \
                 ParameterKey=BuildSpecLocation,ParameterValue=<path-to-buildspec>
```

Example:

```sh
aws cloudformation create-stack \
    --stack-name moduscreate-labs \
    --template-body file://<path-to-repo>/ci/codebuild.cf \
    --parameters ParameterKey=CodeBuildProjectCodeName,ParameterValue=labs \
                 ParameterKey=RepositoryURL,ParameterValue=https://github.com/ModusCreateOrg/labs.git
```

#### Supported parameters:

- *CodeBuildProjectCodeName*: CodeBuild Project codename.
- *RepositoryURL*: HTTPS URL for the Git repository. This should be a valid repository HTTPS URL.
- *RepositoryType*: `CODECOMMIT`|`CODEPIPELINE`|`GITHUB`|`GITHUB_ENTERPRISE`|`BITBUCKET`|`S3`. Default: `GITHUB`.
- *EnvironmentImage*: Image to use for running a container where the build will execute. Needs to respect the format `<repository>/<image>:<tag>`. Default: `aws/codebuild/ubuntu-base:14.04`
- *ComputeType*: `BUILD_GENERAL1_SMALL` (Small 3 GB memory, 2 vCPU) | `BUILD_GENERAL1_MEDIUM` (Medium 7 GB memory, 4 vCPU) | `BUILD_GENERAL1_LARGE` (large 15 GB memory, 8 vCPU). Default: `BUILD_GENERAL1_SMALL`.
- *BuildSpecLocation*: Path of the file `buildspec.yml` to use (Defaults to `<repo-root>/buildspec.yml`

#### Future steps:

- The CI for the hosted project project will still be using codebuild
- The CI infrastructure for capsule will be evolving soon to use codepipeline to execute several integration tests the cloudformation templates and the cli with different node versions.

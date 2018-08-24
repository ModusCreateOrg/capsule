# Capsule

[![MIT Licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ModusCreateOrg/capsule/blob/OAS-15_documentation/LICENSE)

Automated CLI for Static web application hosting on AWS

<p align="left">
    <img src="https://res.cloudinary.com/modus-labs/image/upload/f_auto,q_70,w_200/labs/logo-capsule.svg"
    width="150"
    alt="@modus/capsule">
</p>

## Introduction

This automated script simplifies setting up an AWS site. Add S3 buckets,
register DNS, and create an SSL certificate in minutes with no DevOps knowledge.


## Getting Started

In order to use Capsule you will need the following:

* An AWS account. You can sign up here: https://aws.amazon.com/
* A registered domain name. This can be obtained through AWS or via a third party such as GoDaddy.
* For continuous integration, a source code repository such as GitHub where your static website is located
* A static website (HTMl, JS, CSS) that does not require server side code like PHP, Python or Java.


### Continuous Integration (CI)

Capsule allows for Continuous Integration (CI) of your changes from a source code repository.
As present the CI is currently using codebuild only.

The cloudformation template [codebuild.cf](ci/codebuild.cf) allows you to quickly
setup a basic CI infrastructure for any repository.

#### Requirements

The following section lists any specific requirements for source control products and services.

##### GitHub
The AWS codebuild service must be already authenticated with Github using OAuth before creating the stack.
You can read more on OAuth integration steps on GitHubs website here:

https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/


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

### Future steps:

- The CI for the hosted project will still be using codebuild
- The CI infrastructure for Capsule will be evolving soon to use codepipeline to execute several integration tests the cloudformation templates and the cli with different node versions.



## Templates

Capsule is made up of multiple YAML based Cloud Formation templates.

You can read more about AWS CloudFormation on the AWS official page:

https://aws.amazon.com/cloudformation/

A brief description of each is provided as follows.

### Certificates - template.certificate.yaml

This file handles the certificate manager portion
of the CloudFormation configuration.

You can read more about AWS Certificate Manager here:

https://aws.amazon.com/certificate-manager/


### CloudFront - template.cloudfront.yaml

This file contains the list of parameters required by our
CloudFormation Stack including Error codes, HTTP versions and SSL supported method.
CloudFront acts as a CDN. More documentation can be found at the AWS page here:

https://aws.amazon.com/cloudfront/

### CloudFront Origin Access Identity - template.cfoai.yaml

The CFOAI template contains the configuration required
for CloudFront Origin Access Identity.

You can read more about CFOAI here:

https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html


### Route 53 -  template.route53.yaml

Here you can find the Route 53 configuration for the static website
project.

To learn more about Route 53 you can read the official documents here:

https://aws.amazon.com/route53/


### S3 - template.s3.yaml

Amazon S3 bucket configuration can be found here.
The S3 bucket is where the static resources will be uploaded to and hosted
from.

To learn more visit the official webpage here:

https://aws.amazon.com/s3/


## Modus Create

[Modus Create](https://moduscreate.com) is a digital product consultancy. We use a distributed team of the best talent in the world to offer a full suite of digital product design-build services; ranging from consumer facing apps, to digital migration, to agile development training, and business transformation.

[![Modus Create](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1533109874/modus/logo-long-black.png)](https://moduscreate.com)

This project is part of [Modus Labs](https://labs.moduscreate.com).

[![Modus Labs](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1531492623/labs/logo-black.png)](https://labs.moduscreate.com)

## Licensing

This project is [MIT licensed](./LICENSE).

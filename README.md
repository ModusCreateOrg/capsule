# Capsule

[![MIT Licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ModusCreateOrg/capsule/blob/OAS-15_documentation/LICENSE)

Automated CLI for static web application hosting on AWS using S3 buckets.

<p align="left">
    <img src="https://res.cloudinary.com/modus-labs/image/upload/f_auto,q_70,w_200/labs/logo-capsule.svg"
    width="150"
    alt="@modus/capsule">
</p>

## Introduction

This automated script simplifies setting up an AWS site. Add S3 buckets,
register DNS, and create an SSL certificate in minutes with no DevOps knowledge.

Capsule uses the following AWS technologies:

1. Amazon S3
2. Amazon CloudFormation
3. Amazon Certificate Manager
4. Amazon Route53
5. Amazon CloudFront
6. Amazon CloudBuild


## Getting Started

In order to use Capsule you will need the following:

* An AWS account. You can sign up here: https://aws.amazon.com/
* A registered domain name. This can be obtained through AWS or via a third party such as GoDaddy.
* For continuous integration, a source code repository such as GitHub where your static website is located
* A static website (HTML, JS, CSS) that does not require server side code like PHP, Python or Java.


### Security Credentials

In order to use the Capsule command line interface you will need a number of security credentials.
These credentials are used by the script to interact with your AWS account.


#### Region

Currently only a few regions can handle Certificate Manager in combination with CloudFront. You should therefore when
creating the configuration described in the next section, ensure you chose a region that supports these features.

Amazon provides a fature list at the following site:

https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/

A safe bet is to use `us-east-1` as this is the region that Capsule has been tested in.


#### AWS Config - JSON setup

First we are going to create a single file `config.json`

We a need directory to store this file, so create a new directory `.aws` under the root of your user 

*Mac/Linux*

`mkdir  ~/.aws`

*Windows*

`%UserProfile%\.aws`

Next create the `config.json` file in the .aws directory, containing these keys:

```json
{
  "accessKeyId": <YOUR_ACCESS_KEY_ID>,
  "secretAccessKey": <YOUR_SECRET_ACCESS_KEY>,
  "region": "us-east-1"
}
```

After creating these files, log into your AWS account. We now need to create an Access Key. This can be done as follows:

1. Open your AWS Console
2. Click on your username in the top right
3. Select `My Security Credentials`
4. Fromt he screen that loads, click on `Users` in the sidebar
5. Next click on your username in the table
6. When this loads, click on the `Security Credentials` tab
7. We can now create an Access Key by clking `Create Access Key`
8. Finally click `Show User Security Credentials` and copy the ID and value. 

These details can only be displayed once, so if forget or lose them, you will need to generate a new key. 
If you wish you can download the CSV file from this screen as a backup.

Re-open the config file e.g. vim `~/.aws/config.json`

Now replace the `accessKeyId` value (<YOUR_ACCESS_KEY_ID>) with the value you copied from the AWS console.

Next replace the `secretAccessKey` value (YOUR_SECRET_ACCESS_KEY) wuth the key you copied from the console.

Make sure you wrap the value you paste in with `"` and `"`. 

You can change the region if you wish as well, but please check the region supports all the features required by Capsule.

Save the file. You are now ready to use Capsule to build out your static site. 


#### AWS Config - YAML setup

First we are going to create two files. These are the `config` and `credentials` file.

Create a new directory `.aws` under the root of your user 

*Mac/Linux*

`mkdir  ~/.aws`

*Windows*

`%UserProfile%\.aws`

Next create a credentials file in the .aws directory, containing these keys:

```yaml
[default]
aws_access_key_id=
aws_secret_access_key=
```

After this, create a config file in the .aws directory and include the following:

```yaml
[default]
region=
output=
```

After creating these files, log into your AWS account. We now need to create an Access Key. This can be done as follows:

1. Open your AWS Console
2. Click on your username in the top right
3. Select `My Security Credentials`
4. Fromt he screen that loads, click on `Users` in the sidebar
5. Next click on your username in the table
6. When this loads, click on the `Security Credentials` tab
7. We can now create an Access Key by clking `Create Access Key`
8. Finally click `Show User Security Credentials` and copy the ID and value. 

These details can only be displayed once, so if forget or lose them, you will need to generate a new key. 
If you wish you can download the CSV file from this screen as a backup.

Re-open the credentials file e.g. vim `~/.aws/credentials`

Paste the ID into the key id value:

```yaml
aws_access_key_id=<the id you copied here>
```

Following this, paste the secret value into the secret key value:

```yaml
aws_secret_access_key=<the key value you copied here>
```

Our final step is the edit the `config` file and set a region and output type.

You can chose whichever region makes sense to you, we are going to use us-east-1, and set the output to `json`.

```yaml
[default]
region=us-east-1
output=json
```

Save the file. 

Your credentials and configuration are now setup to use Capsule.

### Your website configuration 

Capsule supports a number of command line parameters to allow you to configure your web site.

In addition to this, you can use a JSON configuration file, containing these values.

An example can be found in the `config/capsule.json` file in the capsule repository. 

When loading configuration options, the JSON config is loaded first, if specified. Following this any command line
parameters are then loaded. Command line parameters will override any parameters specified in the JSON file.

An example can be seen here:

```
./bin/capsule.js create --project-name "exampledotcom" --dom example.com --subdom app --url https://github.com/ExampleCom/exampledotcom  --config ~/.aws/config.json --site_config='{"WebsiteCode":"./build"}' --site_config_file=./config/capsule.json ci
```

In this example the value of the `--site_config` flag will overwrite the the key value pair specified in the `--site_config_file` JSON file.
Thus if `WebsiteCode` is defined in `capsule.json` it's value will be overridden with `./build`.


You can always check what command line parameters are available by running the `capsule -h` command.


If you wish to run multiple bash commands inside of the build or post_build CodeBuild actions, then you will need to pass these as a single paramter.

Use the following chart as a guide for bash commands:

```
A ; B    # Run A and then B, regardless of success of A
A && B  # Run B if and only if A succeeded
A || B  # Run B if and only if A failed
```

In the nodejs world for example this could translate to the following:

```
npm build dev ; npm test
```


### Project Names

During the setup of your site you will need to define a project name. This will be used to name the 
S3 bucket in AWS. Therefore your project name must confirm to the S3 bucket naming standards.

You can find these here:

https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html


### Authorizing your certificate

In order to authorize your certificate you will need to log into the AWS console.

Depending on whether you are using DNS or Email authroitzation you will need to follow the relevant steps below.


### CloudFront waiting time

Once the CloudFormation templates are kicked off the CloudFront stack process, you can expect to wait around ~20 mins for this
process to complete.

You can check on progress under the CloudFront services home page:

https://console.aws.amazon.com/cloudfront/home?region=us-east-1


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

Make sure that the user you have setup in GitHub, to be used by CodeBuild has admin permissions on the repository.

If it does not, you may see errors such as:

```
Repository not found or permission denied. (Service: AWSCodeBuild; Status Code: 400; Error Code: OAuthProviderException; Request ID: <an id value>)
```

This is especially important if you wish to manage webhooks e.g.

```
Triggers:
  Webhook: yes
```

In this case, the user will need Admin permissions. 

You will need to create a webhook in GitHub.

### How to use it?

The `ci` tool can be executed from the command line in order to setup the 
CodeBuild process. Located in this repository are two CodeBUild files:

1. `codebuild_capsule.cf`  - this contains the CodeBuild CF templates for this project 
2. `codebuild_project.cf` - which provides a template for the Capsule user to use for their own project

In addition to the `ci` tool the CodeBuild cf templates can also be executed from the aws cli. 

From the CLI it can be used like this:

```sh
aws cloudformation create-stack \
    --stack-name <your-stack-name> \
    --template-body file://<path-to-repo>/ci/<codebuild_template>.cf \
    --parameters ParameterKey=CodeBuildProjectCodeName,ParameterValue=<project-name> \
                 ParameterKey=RepositoryURL,ParameterValue=<https-clone-url> \
                 ParameterKey=BuildSpecLocation,ParameterValue=<path-to-buildspec>
```

Example:

```sh
aws cloudformation create-stack \
    --stack-name moduscreate-labs \
    --template-body file://<path-to-repo>/ci/codebuild_project.cf \
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


### Using the capsule cli:

The capsule cli is a NodeJS cli app with the intention to simplify the generation of the hosting infrastructure and ci infrastructure. For nested stacks, it requires to generate a base s3 bucket. This can be generated in the following way:

```sh
$ ./capsule create --project-name <project-name> s3
```

For getting the complete list of options, just enter `--help`:

```sh
$ ./bin/capsule.js --help

  Usage: capsule [options]

  Options:

    -V, --version                      Output the version number
    init                               Builds out the web hosting infrastructure in one go
    create                             Initializes the s3 bucket required to store nested stack templates
    update                             Updates the templates into the s3 bucket and runs the nested stack
    delete                             Delete the s3 bucket contents
    -n, --project-name <project-name>  Push cf templates to the s3 bucket, and creates it if it does not exist
    -c, --config <config-path>         Load the configuration from the specified path
    -p, --aws-profile <profile>        The AWS profile to use
    -u, --url <repo>                   The source control URL to use
    -sc, --site_config <site-config>   A JSON object contianing site configuration, overrides values defined in site config file
    -scf, --site_config_file <site-config-path>  Custom configuration file used in CodeBuild for building the static site
    -d, --remove-cf-bucket             Remove the bucket used for storing the nested templates
    -v, --verbose                      Verbose output
    -h, --help                         output usage information

```

To kick off building out a project with a single command, you can use the `init` option. The example below demonstrates this:

```
./bin/capsule.js init --project-name "exampledotcom" --dom example.com --subdom app --url https://github.com/ExampleCom/exampledotcom  --config ~/.aws/config.json --site_config='{"WebsiteCode":"."}' --site_config_file=./config/capsule.json 
```



#### Domain configuration

As part of the process of creating your static site, you will need to point an existing domain or subdomain to your S3 bucket.
When executing the `web` command from the cli the process will halt once it reaches the certificate manager portion.

At this point you should log into your AWS console and select the ` Certificate Manager` service. On this screen the domain 
you passed to the cli should be visible e.g. `example.com`.

Open up the drop-down arrow for the domain and follow the insturctions provived bu Amazon to validate control of the domain. Note that Amazon will send an email to your account at: 

* webmaster@example.com
* admin@example.com
* postmaster@example.com
* administrator@example.com
* hostmaster@example.com

Wjere `example.com` is the domain you passed to the cli tool.

### Future steps:

- The CI for the hosted project will still be using codebuild
- The CI infrastructure for Capsule will be evolving soon to use codepipeline to execute several integration tests the cloudformation templates and the cli with different node versions.
- Add in CloudTrail support for debugging


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

###  CodeBuild - codebuild_project.cf

Included in this project are two CodeBuild Cloud Formation templates:

1. The template for Capsule itself
2. A parameterized template for use with your own project. 

CodeBuild configuration to handle:

1. Creating environment to check project into
2. Pull code from GitHub/Source control 
3. Install code
4. Run tests
5. Create build
6. Upload build to S3 bucket 
7. Setup trigger so that new pushes to master are built/test/deployed

## Modus Create

[Modus Create](https://moduscreate.com) is a digital product consultancy. We use a distributed team of the best talent in the world to offer a full suite of digital product design-build services; ranging from consumer facing apps, to digital migration, to agile development training, and business transformation.

[![Modus Create](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1533109874/modus/logo-long-black.png)](https://moduscreate.com)

This project is part of [Modus Labs](https://labs.moduscreate.com).

[![Modus Labs](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1531492623/labs/logo-black.png)](https://labs.moduscreate.com)

## Licensing

This project is [MIT licensed](./LICENSE).

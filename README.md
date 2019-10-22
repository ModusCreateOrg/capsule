# Capsule

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Powered by Modus_Create](https://img.shields.io/badge/powered_by-Modus_Create-blue.svg?longCache=true&style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzIwIDMwMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNOTguODI0IDE0OS40OThjMCAxMi41Ny0yLjM1NiAyNC41ODItNi42MzcgMzUuNjM3LTQ5LjEtMjQuODEtODIuNzc1LTc1LjY5Mi04Mi43NzUtMTM0LjQ2IDAtMTcuNzgyIDMuMDkxLTM0LjgzOCA4Ljc0OS01MC42NzVhMTQ5LjUzNSAxNDkuNTM1IDAgMCAxIDQxLjEyNCAxMS4wNDYgMTA3Ljg3NyAxMDcuODc3IDAgMCAwLTcuNTIgMzkuNjI4YzAgMzYuODQyIDE4LjQyMyA2OS4zNiA0Ni41NDQgODguOTAzLjMyNiAzLjI2NS41MTUgNi41Ny41MTUgOS45MjF6TTY3LjgyIDE1LjAxOGM0OS4xIDI0LjgxMSA4Mi43NjggNzUuNzExIDgyLjc2OCAxMzQuNDggMCA4My4xNjgtNjcuNDIgMTUwLjU4OC0xNTAuNTg4IDE1MC41ODh2LTQyLjM1M2M1OS43NzggMCAxMDguMjM1LTQ4LjQ1OSAxMDguMjM1LTEwOC4yMzUgMC0zNi44NS0xOC40My02OS4zOC00Ni41NjItODguOTI3YTk5Ljk0OSA5OS45NDkgMCAwIDEtLjQ5Ny05Ljg5NyA5OC41MTIgOTguNTEyIDAgMCAxIDYuNjQ0LTM1LjY1NnptMTU1LjI5MiAxODIuNzE4YzE3LjczNyAzNS41NTggNTQuNDUgNTkuOTk3IDk2Ljg4OCA1OS45OTd2NDIuMzUzYy02MS45NTUgMC0xMTUuMTYyLTM3LjQyLTEzOC4yOC05MC44ODZhMTU4LjgxMSAxNTguODExIDAgMCAwIDQxLjM5Mi0xMS40NjR6bS0xMC4yNi02My41ODlhOTguMjMyIDk4LjIzMiAwIDAgMS00My40MjggMTQuODg5QzE2OS42NTQgNzIuMjI0IDIyNy4zOSA4Ljk1IDMwMS44NDUuMDAzYzQuNzAxIDEzLjE1MiA3LjU5MyAyNy4xNiA4LjQ1IDQxLjcxNC01MC4xMzMgNC40Ni05MC40MzMgNDMuMDgtOTcuNDQzIDkyLjQzem01NC4yNzgtNjguMTA1YzEyLjc5NC04LjEyNyAyNy41NjctMTMuNDA3IDQzLjQ1Mi0xNC45MTEtLjI0NyA4Mi45NTctNjcuNTY3IDE1MC4xMzItMTUwLjU4MiAxNTAuMTMyLTIuODQ2IDAtNS42NzMtLjA4OC04LjQ4LS4yNDNhMTU5LjM3OCAxNTkuMzc4IDAgMCAwIDguMTk4LTQyLjExOGMuMDk0IDAgLjE4Ny4wMDguMjgyLjAwOCA1NC41NTcgMCA5OS42NjUtNDAuMzczIDEwNy4xMy05Mi44Njh6IiBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+)](https://moduscreate.com)
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

### Is Capsule right for me?

If you are exploring how to deploy a single page web application (SPA) this may be a good option for you.

If you need a more comprehensive set of development tools and processses that encompass a wider variety of AWS services, for example, AWS Lambda, you might consider using the [AWS Amplify Console](https://aws.amazon.com/amplify/console/) instead as part of a more comprehensive application development pipeline that uses AWS and DevOps concepts.

## Installation

Install `capsule` as a global CLI from NPM.

```sh
npm install -g capsule
```

You can now use `capsule` from your command line.

## Quick Start - Configuring Your Environment

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


## Quick Start - Configure Your Project

In order to create the `config.json` file containing your project configuration
run the command `capsule.js init`

Answer the questions presented to you on the screen.

If you wish to run multiple bash commands inside of the `build` or `post_build`
CodeBuild actions, then you will need to pass these as a single parameter.

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



## Quick Start - Deploy Your Project

Once the `capsule.json` file is generated, you are now ready to deploy your project to
your AWS account.

To do this, simply type:

`capsule.js deploy`

If you wish to learn more about the templates that are implemented by the
deploy command, please refer to the [templates read me](docs/templates.md) file.

### Authorizing your certificate

In order to authorize your certificate you will need to log into the AWS console.

Depending on whether you are using DNS or Email authorization you will need to follow the relevant steps below.


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

Where `example.com` is the domain you passed to the cli tool.


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

You will need to create a [webhook in GitHub](https://developer.github.com/webhooks/).


## Advanced Options

Capsule comes with a number of advanced options. These allow:

1. A more granular deployment process
2. Overridding default settings in the capsule.json with command line values

To read me please check out the documentation [here](docs/advanced_use.md).

### Templates

To learn more about the CloudFormation templates that make up a portion of the capsule project
please refer to the template documentation [here](docs/templates.md). 

## Contibute to this project

To learn about our contributor guidelines, please check out the documentation [here](docs/contribute.md)

## Modus Create

[Modus Create](https://moduscreate.com) is a digital product consultancy. We use a distributed team of the best talent in the world to offer a full suite of digital product design-build services; ranging from consumer facing apps, to digital migration, to agile development training, and business transformation.

[![Modus Create](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1533109874/modus/logo-long-black.png)](https://moduscreate.com)

This project is part of [Modus Labs](https://labs.moduscreate.com).

[![Modus Labs](https://res.cloudinary.com/modus-labs/image/upload/h_80/v1531492623/labs/logo-black.png)](https://labs.moduscreate.com)

## Licensing

This project is [MIT licensed](./LICENSE).

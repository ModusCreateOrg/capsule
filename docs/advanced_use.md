# Advanced use

The following document provides a guide to the advanced features
provided by capsule.


## Your website configuration

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


## Advanced CLI use

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




### Advanced CI use

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

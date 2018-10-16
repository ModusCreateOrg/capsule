# Templates

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

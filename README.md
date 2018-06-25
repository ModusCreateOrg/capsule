# awstatic

The following README describes the CloudFormation templates based
project, for generating a static website hosted on Amazon S3.


## template.certificate.yaml

This file handles the certificate manager portion
of the CloudFormation configuration.

You can read more about AWS Certificate Manager here:

https://aws.amazon.com/certificate-manager/

## template.cfoai.yaml

The CFOAI template contains the configuration required 
for CloudFront Origin Access Identity

## template.cloudfront.yaml

This file contains the list of parameters required by our
CloudFormation Stack including Error codes, HTTP versions and SSL supported method.

## template.route53.yaml

Here you can find the Route 53 configuration for the static website
project.

https://aws.amazon.com/route53/


## template.s3.yaml

Amazon S# bucket configuration can be found here.
The S3 bucket is where the static resources will be uploaded to and hosted
from.

https://aws.amazon.com/s3/



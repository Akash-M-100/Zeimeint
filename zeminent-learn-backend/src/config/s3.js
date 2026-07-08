'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

// One client per process. Null when S3 isn't configured — s3.service guards
// every call with isS3Configured, so importing this is always safe.
const s3 = env.isS3Configured
  ? new S3Client({
      region: env.aws.region,
      credentials: {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey,
      },
    })
  : null;

module.exports = s3;

# Random suffix keeps the bucket name globally unique (S3 bucket names are global).
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "videos" {
  bucket = "${var.project_name}-videos-${var.environment}-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "videos" {
  bucket = aws_s3_bucket.videos.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # SSE-S3
    }
  }
}

# Bucket is private — all access is via CloudFront (OAC). Block every form
# of public access.
resource "aws_s3_bucket_public_access_block" "videos" {
  bucket = aws_s3_bucket.videos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  cors_rule {
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Clean up storage charged for upload parts that were never completed.
resource "aws_s3_bucket_lifecycle_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    # Empty filter = applies to all objects (required by AWS provider v5).
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Grant read access only to this account's CloudFront distribution, via the
# OAC service principal scoped by source ARN. No public/anonymous access.
resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOACRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.videos.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.videos.arn
          }
        }
      }
    ]
  })

  # Public access block must settle before a bucket policy is accepted.
  depends_on = [aws_s3_bucket_public_access_block.videos]
}

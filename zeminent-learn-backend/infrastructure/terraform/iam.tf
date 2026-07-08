# Programmatic user the backend uses to upload/serve/delete video objects.
resource "aws_iam_user" "backend" {
  name = "${var.project_name}-backend-${var.environment}"
}

resource "aws_iam_access_key" "backend" {
  user = aws_iam_user.backend.name
}

# Least privilege: object-level put/get/delete on the videos bucket only.
# Deliberately NO s3:ListBucket — the backend addresses objects by key and
# has no reason to enumerate the bucket.
resource "aws_iam_user_policy" "backend_s3" {
  name = "${var.project_name}-backend-s3-${var.environment}"
  user = aws_iam_user.backend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "VideoObjectsReadWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.videos.arn}/*"
      }
    ]
  })
}

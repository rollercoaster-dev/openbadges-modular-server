#!/bin/bash
# Script to build multi-architecture Docker images locally
# This is useful for testing multi-architecture builds before pushing to GitHub

set -e

# Default values
IMAGE_NAME="openbadges-modular-server"
TAG="local"
PLATFORMS="linux/amd64,linux/arm64"
PUSH=false
LOAD=true

# Display help message
function show_help {
  echo "Usage: $0 [options]"
  echo ""
  echo "Build multi-architecture Docker images locally"
  echo ""
  echo "Options:"
  echo "  -h, --help                Show this help message"
  echo "  -n, --name NAME           Set the image name (default: $IMAGE_NAME)"
  echo "  -t, --tag TAG             Set the image tag (default: $TAG)"
  echo "  -p, --platforms PLATFORMS Set the platforms to build for (default: $PLATFORMS)"
  echo "  --push                    Push the image to the registry"
  echo "  --no-load                 Don't load the image into Docker (use with --push)"
  echo ""
  echo "Examples:"
  echo "  $0 --name myorg/myimage --tag v1.0.0"
  echo "  $0 --platforms linux/amd64,linux/arm64,linux/arm/v7"
  echo "  $0 --push --no-load"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -h|--help)
      show_help
      exit 0
      ;;
    -n|--name)
      IMAGE_NAME="$2"
      shift
      shift
      ;;
    -t|--tag)
      TAG="$2"
      shift
      shift
      ;;
    -p|--platforms)
      PLATFORMS="$2"
      shift
      shift
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --no-load)
      LOAD=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Full image name with tag
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo "Building multi-architecture Docker image:"
echo "  Image: $FULL_IMAGE_NAME"
echo "  Platforms: $PLATFORMS"
echo "  Push: $PUSH"
echo "  Load: $LOAD"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH"
  exit 1
fi

# Check if Docker Buildx is available
if ! docker buildx version &> /dev/null; then
  echo "Error: Docker Buildx is not available"
  echo "Please install Docker Buildx or upgrade to a newer version of Docker"
  exit 1
fi

# Set up QEMU for multi-architecture emulation
echo "Setting up QEMU for multi-architecture emulation..."
docker run --privileged --rm tonistiigi/binfmt --install all

# Create a new builder instance if it doesn't exist
BUILDER_NAME="multiarch-builder"
if ! docker buildx inspect $BUILDER_NAME &> /dev/null; then
  echo "Creating new builder instance: $BUILDER_NAME"
  docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
fi

# Use the builder
docker buildx use $BUILDER_NAME

# Build options
BUILD_OPTS="--platform $PLATFORMS"

if [ "$PUSH" = true ]; then
  BUILD_OPTS="$BUILD_OPTS --push"
fi

if [ "$LOAD" = true ]; then
  BUILD_OPTS="$BUILD_OPTS --load"
fi

# Build the image
echo "Building image..."
docker buildx build $BUILD_OPTS -t $FULL_IMAGE_NAME .

# Verify the image
if [ "$LOAD" = true ]; then
  echo "Verifying image..."
  docker inspect $FULL_IMAGE_NAME
fi

echo ""
echo "Build completed successfully!"
echo "Image: $FULL_IMAGE_NAME"
echo ""

if [ "$PUSH" = true ]; then
  echo "Image has been pushed to the registry"
  echo "You can pull it with: docker pull $FULL_IMAGE_NAME"
else
  echo "Image is available locally"
  echo "You can run it with: docker run -p 3000:3000 $FULL_IMAGE_NAME"
fi

echo ""
echo "Note: The image was built for the following platforms: $PLATFORMS"
echo "Docker will automatically use the appropriate architecture for your system"

# Multi-Architecture Docker Support

This document provides detailed information about the multi-architecture Docker image support for the Open Badges Modular Server.

## Overview

The Open Badges Modular Server Docker images are built for multiple CPU architectures to ensure compatibility across different development and production environments. This approach allows the same image to run natively on various platforms without emulation, resulting in better performance and broader compatibility.

## Supported Architectures

Our Docker images currently support the following architectures:

| Architecture | Description | Common Platforms |
|--------------|-------------|------------------|
| `linux/amd64` | 64-bit x86 | Intel/AMD processors, most cloud VMs, Windows/Linux PCs |
| `linux/arm64` | 64-bit ARM | Apple Silicon Macs (M1/M2/M3), AWS Graviton, ARM servers |

## Benefits of Multi-Architecture Support

1. **Native Performance**: Images run natively on each platform without emulation
2. **Development Flexibility**: Developers can use the same image regardless of their local machine architecture
3. **Production Versatility**: Deploy to various cloud providers, including those with ARM-based instances
4. **Cost Efficiency**: ARM-based instances often provide better price-performance ratios
5. **Future-Proofing**: As ARM adoption increases in server environments, your application is already compatible

## Using Multi-Architecture Images

### Automatic Architecture Selection

When you pull an image from our GitHub Container Registry, Docker automatically selects the appropriate architecture for your system:

```bash
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

No special flags or configuration are needed - Docker handles the architecture selection transparently.

### Verifying Image Architecture

To verify which architecture variant you're running:

```bash
docker inspect --format '{{.Architecture}}' ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

To see all available architectures for an image:

```bash
docker manifest inspect ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

### Docker Compose

When using Docker Compose, the correct architecture is automatically selected:

```yaml
services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    # ... other configuration
```

## Development Environment Requirements

### macOS

- **Intel Macs**: Works natively with the amd64 image variant
- **Apple Silicon Macs (M1/M2/M3)**: Works natively with the arm64 image variant
- **Requirements**: Docker Desktop 4.0 or later

### Linux

- **x86_64 Systems**: Works natively with the amd64 image variant
- **ARM64 Systems**: Works natively with the arm64 image variant
- **Requirements**: Docker Engine 20.10.0 or later with BuildKit enabled

### Windows

- **Windows x64**: Works natively with the amd64 image variant
- **Windows on ARM**: Uses the arm64 image variant (if available) or emulates amd64
- **Requirements**: Docker Desktop 4.0 or later

## Production Environment Considerations

### Cloud Providers

Many cloud providers now offer ARM-based instances that can provide better price-performance ratios:

- **AWS**: Graviton processors (arm64)
- **Google Cloud**: Tau T2A (arm64)
- **Azure**: ARM-based instances
- **Oracle Cloud**: Ampere A1 (arm64)

Our multi-architecture images work seamlessly on all these platforms.

### Kubernetes

When deploying to Kubernetes, the correct image architecture is automatically selected based on the node architecture:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openbadges-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
        # ... other configuration
```

No special configuration is needed for multi-architecture support in Kubernetes.

## Troubleshooting

### Common Issues

1. **Image Not Found for Architecture**:
   - Ensure you're using the latest image tag
   - Verify that the image has been built for your architecture
   - Check the GitHub Actions workflow logs for build errors

2. **Performance Issues**:
   - Verify you're running the native architecture variant with `docker inspect`
   - Ensure you're not using emulation unintentionally

3. **Docker Compose Compatibility**:
   - Ensure you're using Docker Compose v2.0 or later for best multi-architecture support

### Debugging Commands

Check which architecture variant you're running:

```bash
docker inspect --format '{{.Architecture}}' $(docker ps -q -f name=your-container-name)
```

Verify available architectures for an image:

```bash
docker manifest inspect ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

## Building Multi-Architecture Images Locally

For development purposes, you can build multi-architecture images locally:

```bash
# Set up QEMU for multi-architecture emulation
docker run --privileged --rm tonistiigi/binfmt --install all

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t your-local-tag .
```

## Further Reading

- [Docker Multi-Platform Images](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Actions for Multi-Platform Builds](https://docs.docker.com/build/ci/github-actions/)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)

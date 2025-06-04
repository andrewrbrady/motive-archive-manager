# C++ Programs Archive

## Overview

This directory contains C++ programs, Docker infrastructure, and associated canvas service files that were previously part of the main Motive Archive Manager build process. These programs were archived to streamline the build process and eliminate unnecessary C++ compilation dependencies from the Next.js application.

## Archived Date

**December 2024** - Moved to archive during build process optimization phase

## Reason for Archival

1. **Build Complexity**: C++ compilation added unnecessary complexity to the Next.js build process
2. **Dependency Management**: Required OpenCV and C++ toolchain setup for all developers
3. **Cross-Platform Issues**: Different binaries needed for macOS, Linux, and Vercel deployment
4. **Performance**: C++ compilation significantly slowed down build times
5. **Maintenance Overhead**: C++ programs required separate maintenance from the core Next.js application
6. **Docker Infrastructure**: Complex containerization setup for C++ service deployment

## Archived Programs

### 1. Canvas Extension Tool (`extend_canvas.cpp`)

- **Purpose**: Extends image canvas height while preserving car positioning and maintaining white backgrounds
- **Key Features**:
  - Auto-detection of foreground content using brightness sampling
  - Adaptive white threshold calculation
  - Intelligent padding and cropping
  - Support for different output canvas heights
- **Dependencies**: OpenCV 4
- **Binary Variants**: `extend_canvas`, `extend_canvas_macos`, `extend_canvas_linux`

### 2. Image Cropper (`image_cropper.cpp`)

- **Purpose**: Crops images to specific dimensions with scaling and centering
- **Key Features**:
  - Precise crop area specification
  - Automatic scaling and aspect ratio handling
  - Centered placement on output canvas
  - Default 9:16 vertical format support
- **Dependencies**: OpenCV 4
- **Binary**: `image_cropper`

### 3. Matte Generator (`matte_generator.cpp`)

- **Purpose**: Creates image mattes with custom background colors and padding
- **Key Features**:
  - Aspect ratio preservation
  - Custom hex color backgrounds
  - Configurable padding percentages
  - Centered image placement
- **Dependencies**: OpenCV 4
- **Binary Variants**: `matte_generator`, `matte_generator_macos`

## Archive Structure

```
archive/cpp-programs/
├── README.md                           # This comprehensive documentation
├── ARCHIVAL_SUMMARY.md                # Summary of archival process
├── source-code/                       # Original C++ source files
│   ├── extend_canvas.cpp              # Canvas extension source
│   ├── image_cropper.cpp              # Image cropping source
│   └── matte_generator.cpp            # Matte generation source
├── compiled-binaries/                 # Pre-compiled executables
│   ├── extend_canvas                  # macOS binary
│   ├── extend_canvas_macos            # macOS specific binary
│   ├── extend_canvas_linux            # Linux binary (1.7MB)
│   ├── image_cropper                  # macOS binary
│   ├── matte_generator                # macOS binary
│   └── matte_generator_macos          # macOS specific binary
├── build-scripts/                     # Build and compilation scripts
│   ├── build-cpp.sh                  # Main build script with OpenCV support
│   ├── compile-for-vercel.sh          # Vercel deployment compilation
│   ├── create-test-binary.sh          # Test binary creation
│   └── download-and-commit-binary.sh  # Binary download utility
├── docker-files/                      # Docker containerization files
│   ├── Dockerfile.canvas              # Canvas service Dockerfile
│   ├── Dockerfile.canvas-service      # Canvas service main Dockerfile
│   ├── Dockerfile.canvas-service-node # Node.js-based canvas service
│   ├── Dockerfile.canvas-service-simple # Simplified canvas service
│   ├── Dockerfile.canvas-service-test # Testing Dockerfile
│   ├── Dockerfile.debug               # Debug environment
│   ├── Dockerfile.minimal             # Minimal deployment
│   └── Dockerfile.test-public         # Public testing environment
├── canvas-service-app/                # Node.js canvas service application
│   ├── server.js                      # Express server for canvas operations
│   ├── package.json                   # Node.js dependencies
│   ├── package-lock.json              # Dependency lock file
│   └── node_modules/                  # Complete dependency tree
├── deployment/                        # Cloud deployment configurations
│   ├── cloudbuild.yaml               # Google Cloud Build configuration
│   └── canvas-service-key.json       # Service account key (empty)
├── test-files/                        # Testing and debugging scripts
│   ├── test-canvas-extension.js       # Canvas extension tests
│   ├── test-cloud-run-auth.js         # Cloud Run authentication tests
│   ├── debug-server.js                # Debug server for development
│   └── minimal-server.js              # Minimal server implementation
└── documentation/                     # Additional documentation
```

## Canvas Service Application

### Node.js Express Server (`canvas-service-app/server.js`)

- **Port**: 8080 (configurable)
- **Framework**: Express.js with CORS support
- **Features**:
  - File upload handling with Multer
  - Canvas extension endpoint `/extend-canvas`
  - Matte generation endpoint `/create-matte`
  - Image cropping endpoint `/crop-image`
  - Health check endpoint `/health`

### Dependencies (canvas-service-app/package.json)

- express: Web framework
- multer: File upload handling
- cors: Cross-origin resource sharing
- Additional utility packages for stream handling

## Docker Infrastructure

### Container Images

1. **Dockerfile.canvas-service**: Main production container with OpenCV
2. **Dockerfile.canvas-service-simple**: Simplified deployment container
3. **Dockerfile.canvas-service-node**: Node.js-focused container
4. **Dockerfile.canvas-service-test**: Testing environment with debugging tools
5. **Dockerfile.debug**: Development debugging container
6. **Dockerfile.minimal**: Lightweight production container
7. **Dockerfile.test-public**: Public testing environment

### Cloud Deployment

- **Google Cloud Build**: `cloudbuild.yaml` configuration
- **Google Cloud Run**: Containerized deployment target
- **Service Authentication**: Key-based authentication setup

## Build Configuration

### Original Build Script

- **File**: `build-cpp.sh`
- **Purpose**: Compiled all C++ programs with OpenCV support
- **Features**:
  - CI/CD environment detection (Vercel)
  - Cross-platform compilation support
  - Graceful fallback when OpenCV unavailable
  - Binary verification tests

### Integration Points (Now Removed)

#### package.json Scripts

```json
{
  "build": "npm run build:cpp && next build",
  "build:cpp": "./build-cpp.sh"
}
```

#### Next.js Configuration

- C++ binaries were included in `next.config.js` for deployment
- API routes referenced compiled binaries directly

#### API Integration

The following API routes used these C++ programs:

- `/api/images/extend-canvas` - Used `extend_canvas` binary
- `/api/images/create-matte` - Used `matte_generator` binary
- `/api/images/live-preview` - Used `image_cropper` binary

#### Canvas Service Integration

- Microservice architecture for image processing
- Docker-based deployment to Google Cloud Run
- RESTful API endpoints for all image operations
- Automatic binary selection based on platform

## Replacement Strategy

### Phase 1: Immediate Archival ✅

- Move C++ source files to archive
- Move Docker infrastructure to archive
- Move canvas service application to archive
- Remove C++ compilation from build process
- Update package.json scripts
- Document dependencies and usage

### Phase 2: Alternative Implementation (Future)

- **Option A**: Replace with Node.js Sharp library for image processing
- **Option B**: Use cloud-based image processing APIs (Cloudflare Images, etc.)
- **Option C**: Implement in TypeScript with canvas APIs for simpler operations
- **Option D**: Serverless functions with containerized image processing

## Dependencies That Were Removed

### Development Dependencies

- OpenCV 4 development libraries
- C++ compiler toolchain (g++)
- pkg-config for library detection
- Docker and containerization tools

### Runtime Dependencies

- Pre-compiled binaries for different platforms
- OpenCV runtime libraries
- Node.js Express server for canvas service
- Google Cloud Run deployment infrastructure

### Service Dependencies

- Google Cloud Build for CI/CD
- Google Cloud Run for container hosting
- Service account authentication
- Docker registry and image management

## Migration Notes

### Files Moved to Archive

- **Source Code**: `*.cpp` files → `archive/cpp-programs/source-code/`
- **Binaries**: Compiled executables → `archive/cpp-programs/compiled-binaries/`
- **Build Scripts**: `*.sh` files → `archive/cpp-programs/build-scripts/`
- **Docker Files**: `Dockerfile.*` → `archive/cpp-programs/docker-files/`
- **Canvas Service**: `canvas-service/` → `archive/cpp-programs/canvas-service-app/`
- **Deployment**: Cloud configs → `archive/cpp-programs/deployment/`
- **Tests**: Test scripts → `archive/cpp-programs/test-files/`

### Build Process Changes

- Removed `npm run build:cpp` from main build command
- Removed C++ binary paths from `next.config.js`
- Updated CI/CD configuration to skip C++ compilation
- Removed Docker build steps from deployment pipeline

## Recovery Instructions

If these C++ programs and canvas service need to be restored:

### C++ Programs

1. **Copy source files back** from `archive/cpp-programs/source-code/`
2. **Install OpenCV 4** on target system
3. **Restore build script** from `archive/cpp-programs/build-scripts/`
4. **Update package.json** to include `build:cpp` script
5. **Update API routes** to reference binary paths
6. **Test compilation** with `./build-cpp.sh`

### Canvas Service

1. **Copy canvas-service-app** back to root as `canvas-service/`
2. **Copy Dockerfiles** back to root directory
3. **Restore deployment configs** for Google Cloud
4. **Update API routes** to use service endpoints
5. **Test Docker builds** and service deployment
6. **Configure Google Cloud authentication**

### Full Infrastructure

1. **Restore all archived components** following above steps
2. **Update next.config.js** with binary and service configurations
3. **Test both local compilation and service deployment**
4. **Verify all API endpoints** function correctly
5. **Update documentation** to reflect restored architecture

## Impact Assessment

### Before Archival

- Build process included C++ compilation step
- Developers needed OpenCV installed locally
- CI/CD required pre-compiled binaries
- Cross-platform compatibility challenges
- Docker infrastructure for canvas service
- Google Cloud deployment pipeline

### After Archival

- ✅ Simplified build process (Next.js only)
- ✅ Reduced developer environment setup
- ✅ Faster build times
- ✅ Eliminated C++ toolchain dependencies
- ✅ Removed Docker complexity from main project
- ✅ Simplified deployment pipeline
- ⚠️ Image processing features temporarily disabled
- ⚠️ Canvas service endpoints return errors
- ⚠️ Docker-based deployment discontinued

## Technical Specifications

### Compilation Requirements

```bash
g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp `pkg-config --cflags --libs opencv4`
```

### OpenCV Version

- Minimum: OpenCV 4.0
- Tested: OpenCV 4.5+
- Platform: Linux, macOS

### Binary Compatibility

- macOS: Universal binary support
- Linux: x86_64 architecture
- Vercel: Ubuntu-based deployment environment

### Docker Requirements

- Docker Engine 20.10+
- Google Cloud SDK for deployment
- Node.js 18+ for canvas service
- Express.js framework
- Multer for file uploads

### Canvas Service API

- **Base URL**: `http://localhost:8080` (development)
- **Production**: Google Cloud Run endpoint
- **Authentication**: Service account key-based
- **File Uploads**: Multipart form data
- **Response Format**: JSON with base64 encoded images

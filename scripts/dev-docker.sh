#!/bin/bash

# Development Docker Canvas Service Manager
set -e

CONTAINER_NAME="motive-canvas-service"
IMAGE_NAME="motive-canvas-service"
PORT="8080:3000"

case "$1" in
  start)
    echo "🚀 Starting Docker canvas service..."
    
    # Check if container exists
    if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
      echo "📦 Container exists, starting..."
      docker start $CONTAINER_NAME
    else
      echo "📦 Creating and starting new container..."
      docker run -d -p $PORT --name $CONTAINER_NAME $IMAGE_NAME
    fi
    
    echo "⏳ Waiting for service to be ready..."
    sleep 3
    
    if curl -s http://localhost:8080/health > /dev/null; then
      echo "✅ Canvas service is running at http://localhost:8080"
      echo "🔍 Health check: curl http://localhost:8080/health"
    else
      echo "❌ Service failed to start properly"
      docker logs $CONTAINER_NAME
    fi
    ;;
    
  stop)
    echo "🛑 Stopping Docker canvas service..."
    docker stop $CONTAINER_NAME 2>/dev/null || echo "Container was not running"
    ;;
    
  restart)
    echo "🔄 Restarting Docker canvas service..."
    $0 stop
    $0 start
    ;;
    
  rebuild)
    echo "🔨 Rebuilding Docker canvas service..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    echo "📦 Building new image..."
    docker build -f Dockerfile.canvas-service -t $IMAGE_NAME .
    $0 start
    ;;
    
  logs)
    echo "📋 Showing canvas service logs..."
    docker logs -f $CONTAINER_NAME
    ;;
    
  status)
    echo "📊 Canvas service status:"
    if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
      echo "✅ Container is running"
      echo "🔍 Testing health endpoint..."
      if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ Service is healthy"
      else
        echo "❌ Service is not responding"
      fi
    else
      echo "❌ Container is not running"
    fi
    ;;
    
  clean)
    echo "🧹 Cleaning up Docker canvas service..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    docker rmi $IMAGE_NAME 2>/dev/null || true
    echo "✅ Cleanup complete"
    ;;
    
  *)
    echo "🐳 Motive Canvas Service Docker Manager"
    echo ""
    echo "Usage: $0 {start|stop|restart|rebuild|logs|status|clean}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the canvas service container"
    echo "  stop    - Stop the canvas service container"
    echo "  restart - Restart the canvas service container"
    echo "  rebuild - Rebuild image and restart container"
    echo "  logs    - Show container logs (follows)"
    echo "  status  - Show service status and health"
    echo "  clean   - Remove container and image completely"
    echo ""
    echo "Development: Uses http://localhost:8080"
    echo "Production:  Uses https://canvas-service-public-s6vo3k273a-uc.a.run.app"
    ;;
esac 
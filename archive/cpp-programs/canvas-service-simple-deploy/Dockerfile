FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

RUN apt-get update && apt-get install -y \
    curl \
    g++ \
    make \
    pkg-config \
    libopencv-dev \
    libopencv-contrib-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY *.js ./
COPY node_modules/ ./node_modules/
COPY extend_canvas.cpp ./
COPY matte_generator.cpp ./
COPY image_cropper.cpp ./

RUN g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp $(pkg-config --cflags --libs opencv4)
RUN g++ -std=c++17 -O2 -Wall -o matte_generator matte_generator.cpp $(pkg-config --cflags --libs opencv4)
RUN g++ -std=c++17 -O2 -Wall -o image_cropper image_cropper.cpp $(pkg-config --cflags --libs opencv4)

RUN chmod +x extend_canvas matte_generator image_cropper
RUN mkdir -p /tmp/canvas-extension /tmp/image-matte /tmp/image-crop

CMD ["node", "server.js"]

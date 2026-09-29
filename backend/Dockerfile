FROM node:18-bullseye

# Install python3, pip, venv, and libreoffice
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libreoffice \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN python3 -m venv venv && ./venv/bin/pip install -r requirements.txt

# Copy all application code
COPY . .

# Environment variables for Render
ENV NODE_ENV=production
ENV PYTHON_BIN=/app/venv/bin/python
ENV PYTHON_STAGE_DIR=/app
ENV OUTPUTS_DIR=/app/outputs
ENV UPLOADS_DIR=/app/uploads

# Ensure directories exist
RUN mkdir -p /app/outputs /app/uploads

EXPOSE 3000

CMD ["npm", "start"]

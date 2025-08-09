# ---------- Stage 1: Base for Node.js + Python ----------
FROM node:18-bullseye AS base

# Install Python & pip
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json & requirements.txt first for caching
COPY package.json requirements.txt ./

# Install Node.js dependencies
RUN npm install

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy rest of the project
COPY . .

# ---------- Stage 2: Final image ----------
FROM base AS final

WORKDIR /app

# Default command
CMD ["bash"]

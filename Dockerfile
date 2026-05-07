# Stage 1 -- Build the React/Vite frontend
FROM node:20-alpine AS frontend-build

WORKDIR /build

COPY project/shared/ ./project/shared/
COPY project/frontend/package*.json ./project/frontend/

WORKDIR /build/project/frontend
RUN npm ci --prefer-offline

COPY project/frontend/ ./
RUN npm run build


# Stage 2 -- Python runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && apt-get clean

COPY project/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY core/            ./core/
COPY project/backend/ ./project/backend/

COPY --from=frontend-build /build/project/frontend/dist/ ./project/frontend/dist/

RUN mkdir -p data

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "project.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

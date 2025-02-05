FROM node:20-alpine

ARG REGISTRY
ARG REGISTRY_TOKEN
ARG TAG=latest
RUN if [[ ! -z "$REGISTRY_TOKEN" ]]; then echo "//$REGISTRY/:_authToken=$REGISTRY_TOKEN" >> ~/.npmrc ; fi
RUN if [[ ! -z "$REGISTRY" ]] ; then npm config set @flowfuse:registry "https://$REGISTRY"; fi

WORKDIR /usr/src/mqtt-schema-agent
RUN npm install --production --no-audit --no-fund @flowfuse/mqtt-schema-agent@$TAG

LABEL org.label-schema.name="FlowFuse MQTT Schema Agent" \
    org.label-schema.url="https://flowfuse.com" \
    org.label-schema.vcs-type="Git" \
    org.label-schema.vcs-url="https://github.com/flowfuse/mqtt-schema-agent" \
    org.label-schema.docker.dockerfile="docker/Dockerfile" \
    org.schema-label.description="Collects Topic Schema from a MQTT broker" \
    authors="FlowFuse Inc."

CMD ["./node_modules/.bin/mqtt-schema-agent"]
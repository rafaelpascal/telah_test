import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "PDF Service API",
    description: "PDF Service API Documentation",
    version: "1.0.0",
  },
  host: "localhost:6001",
  schemes: ["http"],
};

const outputFile = "./swagger-output.json";

// ✅ Add multiple route files here
const endpointsFiles = ["./routes/auth.route.ts", "./routes/message.route.ts"];

swaggerAutogen()(outputFile, endpointsFiles, doc);

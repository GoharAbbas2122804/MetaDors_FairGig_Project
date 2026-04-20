const { app, connectMongoWithFallback, getMongoStatus } = require("./app");

const PORT = process.env.PORT || 5001;

async function startServer() {
  await connectMongoWithFallback();

  app.listen(PORT, () => {
    console.log(`service-auth-earnings is running on port ${PORT}`);
    console.log(`Database status: ${getMongoStatus()}. Connected to MongoDB.`);
  });
}

startServer().catch((error) => {
  console.error("MongoDB connection error:", error.message);
  process.exit(1);
});

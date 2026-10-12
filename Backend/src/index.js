import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const [{ default: app }, { default: connectDatabase }] = await Promise.all([
      import("./app.js"),
      import("./config/db.js"),
    ]);

    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server is listening at ${PORT}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  }
};

startServer();
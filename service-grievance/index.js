const app = require("./app");

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`service-grievance is running on port ${PORT}`);
});

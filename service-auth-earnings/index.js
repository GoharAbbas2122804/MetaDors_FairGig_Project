const app = require("./app");

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`service-auth-earnings is running on port ${PORT}`);
});

const express = require("express");
const app = express();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const bcrypt = require("bcrypt");
app.use(express.json());
const jwt = require("jsonwebtoken");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started successfully");
    });
  } catch (e) {
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

const logger = (request, response, next) => {
  console.log(request.query);
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "string", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//API 1
app.post("/login/", authenticateToken, async (request, response) => {
  const { username, password } = request.body;
  const getRes = `SELECT * FROM user where username='${username}';`;
  const dbUser = await db.run(getRes);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const pass = await bcrypt.compare(password, dbUser.password);

    if (pass === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "string");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API 2
app.get("/states/", authenticateToken, async (request, response) => {
  // const { username, password } = request.body;
  const getRes = `SELECT * FROM state;`;
  const dbUser = await db.all(getRes);
  response.send(dbUser);
});
//API 3
app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getRes = `SELECT * FROM state where state_id='${stateId}';`;
  const dbUser = await db.get(getRes);
  response.send({
    stateId: dbUser.state_id,
    stateName: dbUser.state_name,
    population: dbUser.population,
  });
});
//API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const getRes = `INSERT INTO district
   (district_name, state_id,cases,cured,active,deaths )
   VALUES (
       '${districtName}',
       '${stateId}',
       '${cases}',
       '${cured}',
       '${active}',
       '${deaths}'
   );`;

  const dbResponse = await db.run(getRes);
  const disId = dbResponse.lastID;
  response.send("District Successfully Added");
});
//API 5
app.get(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const getRes = `SELECT * FROM district where district_id='${districtId}';`;
    const dbUser = await db.get(getRes);
    response.send({
      districtId: dbUser.districtId,
      districtName: dbUser.district_name,
      stateId: dbUser.state_id,
      cases: dbUser.cases,
      cured: dbUser.cured,
      active: dbUser.active,
      deaths: dbUser.deaths,
    });
  }
);
//API 6
app.delete(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    //const { districtName, stateId, cases, cured, active, deaths } = request.body;
    const getRes = `SELECT * FROM district where district_id='${districtId}';`;
    const dbUser = await db.run(getRes);
    response.send("District Removed");
  }
);
//API 7
app.put(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const getRes = `UPDATE district SET
   district_name= '${districtName}',
    state_id= '${stateId}',
    cases= '${cases}',
    cured= '${cured}',
    active= '${active}',
    deaths= '${deaths}'
  where district_id='${districtId}';`;
    const dbUser = await db.run(getRes);
    response.send("District Details Updated");
  }
);
//API7
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStatesNames = `SELECT 
  SUM(cases) as c,
  SUM(cured) as cu,
  SUM(active) as a,
  SUM(deaths) as d
  FROM district  WHERE state_id=${stateId};`;
    const stats = await db.get(getStatesNames);
    //console.log(stats);
    response.send({
      totalCases: stats.c,
      totalCured: stats.cu,
      totalActive: stats.a,
      totalDeaths: stats.d,
    });
  }
);
module.exports = app;

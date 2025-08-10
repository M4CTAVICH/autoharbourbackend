import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Express with TypeScript + NodeNext!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

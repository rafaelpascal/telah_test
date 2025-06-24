import express, { Router } from "express";
import { generate_receipt } from "../controls/controls";

const router: Router = express.Router();

router.post("/generat_recipt", generate_receipt);
export default router;

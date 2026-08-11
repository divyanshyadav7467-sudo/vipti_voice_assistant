import { Router, type IRouter } from "express";
import healthRouter from "./health";
import viptiRouter from "./vipti";

const router: IRouter = Router();

router.use(healthRouter);
router.use(viptiRouter);

export default router;

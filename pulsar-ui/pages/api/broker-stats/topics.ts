// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from "next";

const metricsUpdateInterval = 10 * 1000;
let metrics = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {

}


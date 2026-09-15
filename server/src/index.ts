import { Hono } from 'hono';
import { HTTPException } from "hono/http-exception";

type Bindings = {
  GAME_KV: KVNamespace;
};

const app = new Hono()


type gameData = {
  gameid?: string;
  name: string;
  score: number;
}
app.get('/api/v1/:game', async (c) => {
  const body = await c.req.json<gameData>();

  if (!body.name || body.name.trim().length === 0) {
    throw new HTTPException(400, { message: "Player name is required" });
  }

  if (body.score < 0 || body.score > 100) {
    throw new HTTPException(400, { message: "Score must be between 0 and 100" });
  }

  const payload: gameData = {
    gameid: crypto.randomUUID(),
    name: body.name,
    score: body.score
  }
  await c.env.GAME_KV.put(`game:$`)

})

export default app

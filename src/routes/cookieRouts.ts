import { Router, Request, Response } from 'express';

const router = Router();


router.get('/set-cookie', (req: Request, res: Response) => {
  res.cookie('myCookie', 'cookieValue', {
    maxAge: 15 * 60 * 1000,
    httpOnly: true, // Ensures the cookie is not accessible via client-side scripts.
  });
  res.send('Cookie has been set');
});


router.get('/get-cookie', (req: Request, res: Response) => {
  const myCookie = req.cookies.myCookie;
  res.send(`The value of myCookie is: ${myCookie}`);
});

export default router;

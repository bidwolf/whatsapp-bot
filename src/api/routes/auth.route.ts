import express, { Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
const verifyJwt = require('../middlewares/verifyJwt')
const config = require('../../config/config')
const secretKey = config.token

const router = express.Router()
router.route('/login').post((req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username === 'romulo' && password === 'IeRtagelfRAg') {
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });
  } else {
    res.status(401).send('Unauthorized');
  }

})
interface CustomRequest extends Request {
  user?: string | JwtPayload;
}
router.route('/signout').get(verifyJwt, (req: CustomRequest, res: Response) => {
  delete req.user;
  res.status(200).json({ message: 'Signout successful' });
})
router.route('/verify').get(verifyJwt, (req: CustomRequest, res: Response) => {
  res.status(200).json({ message: 'Token is valid' });
})

module.exports = router

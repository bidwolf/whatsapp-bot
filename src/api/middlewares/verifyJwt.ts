import { Request, Response, NextFunction } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
const config = require('../../config/config')
const secretKey = config.token
interface CustomRequest extends Request {
  user?: string | JwtPayload;
}

const authenticateJWT = (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (token) {
    jwt.verify(token, secretKey, (err: jwt.VerifyErrors | null, user: string | JwtPayload | undefined) => {
      if (err) {
        return res.status(403).send('Forbidden');
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).send('Unauthorized');
  }
}

module.exports = authenticateJWT;

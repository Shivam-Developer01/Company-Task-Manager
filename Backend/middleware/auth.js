const jwt = require('jsonwebtoken');

const auth = async (req,res,next)=>{

    const authHeader =
        req.headers.authorization;

    if(
        !authHeader ||
        !authHeader.startsWith('Bearer ')
    ){
        return res.status(401).json({
            msg:'Unauthorized'
        });
    }

    const token =
        authHeader.split(' ')[1];

    try{

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = {
            userId: decoded.userId
        };

        next();

    }catch(error){

        return res.status(401).json({
            msg:'Invalid Token'
        });
    }
};

module.exports = auth;
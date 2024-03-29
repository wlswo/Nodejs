const express = require('express');
const jwt = require('jsonwebtoken');
const {verifyToken, apiLimiter} = require('./middleware');
const {Domain, User, Post, Hashtag} = require('../models');
const router = express.Router();

const cors = require('cors');
const url = require('url');

//등록된 domain에서는 CORS 가 적용되도록 설정
router.use(async(req,res, next) => {
    const domain = await Domain.findOne({
        where : {host : url.parse(req.get('origin')).host}
    });
    if(domain) {
        cors ({
            origin : req.get('origin'),
            credential : true
        })(req,res,next);
    }else{
        next();
    }
})

//토큰 요청을 처리 
router.post('/token', async (req, res) => {
    const { clientSecret } = req.body;
   
    try {
        //도메인 가져오기 
      const domain = await Domain.findOne({
        where: {clientSecret},
        include: {
          model: User,
          attribute: ['nick', 'id'],
        },
      });
      if (!domain) {
        return res.status(401).json({
          code: 401,
          message: '등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
        });
      }const token = jwt.sign({
        id: domain.User.id,
        nick: domain.User.nick,
      }, process.env.JWT_SECRET, {
        expiresIn: '1m', // 1분
        issuer: 'nodebird',
      });
      return res.json({
        code: 200,
        message: '토큰이 발급되었습니다',
        token,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        code: 500,
        message: '서버 에러',
      });
    }
});
router.get('/test', verifyToken, (req, res) => {
    res.json(req.decoded);
});

//클라이언트의 요청을 처리하기 위한 코드
//접속한 클라이언트가 작성한 post를 전부 전송
router.get('/posts/my',apiLimiter ,verifyToken, (req,res)=> {
  //id가 작성한 모든 Post찾ㅇ오기
  Post.findAll({where:{userId:req.decoded.id}})
  .then((posts) => {
    res.json({
      code:200,
      payload:posts
    })
  })
  .catch( (err) => {
    return res.status(500).json({
      code:500,
      message : '서버 에러'
    })
  })
})

module.exports = router;


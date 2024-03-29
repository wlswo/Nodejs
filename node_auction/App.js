const express = require('express');
const dotenv = require('dotenv');



dotenv.config();

//서버 설정
const app = express();
//로그 출력을 위한 파일 과 경로를 위한 모듈 설정
const fs = require('fs');
const path = require('path');
//static 파일의 경로 설정
//static 파일이란 - 내용이 변하지 않는 파일 
//html, css, js, 이미지, 동영상, 사운드 파일 등
//이 파일의 경로는 / 가 프로젝트 내의 public 과 매핑됨 
app.use(express.static(path.join(__dirname, 'public')));

//view template 설정
const nunjucks = require('nunjucks');
app.set('view engine', 'html'); 
nunjucks.configure('views', {
    express:app,
    watch: true, 
});

const morgan = require('morgan');
const FileStreamRotator = require('file-stream-rotator');

const logDirectory = path.join(__dirname, 'log');

// 로그 디렉토리 생성
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// 로그 파일 옵션 설정
const accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'access-%DATE%.log'),
  frequency: 'daily',
  verbose: false
});

// 로그 설정
app.use(morgan('combined', {stream: accessLogStream}));
//출력하는 파일 압축해서 전송
const compression = require('compression');
app.use(compression());

//post 방식의 파라미터 읽기
var bodyParser = require('body-parser');
app.use( bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

//쿠키 설정
const cookieParser = require('cookie-parser');
app.use(cookieParser(process. env.COOKIE_SECRET));
//세션 설정
const session = require("express-session");
var options = {
    host :process.env.HOST,
	port : process.env.MYSQLPORT,
	user : process.env.USERID,
	password : process.env.PASSWORD,
	database : process.env.DATABASE
};

const MySQLStore = require('express-mysql-session')(session);

app.use(
    session({
      secret: process.env.COOKIE_SECRET,
      resave: false,
      saveUninitialized: true,
      store : new MySQLStore(options)
    })
);



const passport = require('passport');
const passportConfig = require('./passport');
passportConfig();
app.use(passport.initialize());
app.use(passport.session());

const indexRouter = require('./routes');
app.use('/', indexRouter);

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);



//에러가 발생한 경우 처리
app.use((req, res, next) => {
    const err = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
	err.status = 404;
	next(err);
});

//에러가 발생한 경우 처리
app.use((err, req, res, next) => {
	res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

//sequelize 추출 => sequelize 싱크 맞추기 
//테이블 존재 유무 검사후 테이블 생성 , db연결  
const {sequelize} = require("./models");

sequelize.sync({force:false}).then( ()=> {
    console.log("데이터 베이스 연결 성공");
}).catch( (err) => {
    console.log(err);
})

app.set('port', process.env.PORT);


const sse = require('./sse');
const webSocket = require('./socket');


const server = app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});

webSocket(server,app);
sse(server);

const checkAuction = require('./checkAuction');
//checkAuction();
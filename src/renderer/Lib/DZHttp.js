const { ErrorCode } = require('./DZError');
const IPCMgr = require('./IPCController');
const logger = require('electron-log');

///////////////////// protocol defined ////////////////////////

const PIDS = {
  'Login': 'P076',
  'AttachFileInfo': 'P002',
  'AttachFileSend': 'P003',
  'MainCount': 'P062',
  'UpdatePush': 'P015',
  'UpdatePushRegId': 'P016',
  'AttachFileUpload': 'P063',
  'AttachFileDownload': 'P084',
  'AttachFileSave': 'P085',
  'UpdateUserImg': 'P019',
  'UpdatePasswd': 'P020',
  'UpdateMainComp': 'P021',
  'SearchRoomList': 'P077',
  'InsertRoom': 'P078',
  'ChatSend': 'P079',
  'RoomDetail': 'P080',
  'SearchChatList': 'P081',
  'ChatList': 'P082',
  'SearchProjectRoomList': 'P083',
  'ChatReadUserList': 'P086',
  'RoomIn': 'P087',
  'RoomOut': 'P088',
  'RoomTiltleUpdate': 'P089',
  'RoomAlarm': 'P090',
  'ChatDelete': 'P091',
  'MyGroupList': 'P092',
  'MyGroupInsert': 'P093',
  'MyGroupUpdate': 'P094',
  'MyGroupDelete': 'P095',
  'MyGroupMemberInsert': 'P096',
  'MyGroupMemberDelete': 'P097',
  'SearchRoomInfo': 'P169',
  'RoomCheck': 'P190',
  'MsgLinkVer': 'P207',
  'MsgLinkList': 'P208',
  'MsgLinkToken': 'P209',
  'AlertCount': 'P187',
  'AlertList': 'P188',
  'AlertRead': 'P189',
  'MessageUnReadCnt': 'P244',
  'MessageList': 'P245',
  'MessageDetail': 'P246',
  'SendMessage': 'P247',
  'MessageDelete': 'P248',
  'MessageRead': 'P249',
  'MessageRecvList': 'P284',
  'MessageMark': 'P285',
  'DirectDownload': 'P293',
  'SearchNoticeList': 'P294',
  'MessageCancel': 'P319',
  'ClientInfoList': 'P322',
  'ClientInfoUpdate': 'P323',
  'SearchRoomListByRoomName': 'P326',
  'RoomMark': 'P327',
  'RoomMarkNew': 'P331',
  'ChatRead': 'P342',
  'RoomFileList': 'P344',
  'RoomReceiverList': 'P346',
  'AlertCntNew': 'P355',
  'AlertListNew': 'P356',
  'AlertReadNew': 'P357',
  'AlertReadAllNew': 'P360',
  'Ladder_LoadGame': 'P396',
  'Ladder_LoadResult': 'P397',
  'ReserveMessageStatus': 'P402',
  'AllChatClear': 'P408',
  'SearchPersonnelCardInfo': 'P426',
  'RoomPinUpYn': 'P416',
  'TalkChatInfo': 'P436',
  'VTalkURL': 'P477',
  'MessageCollect': 'P511',
  'TalkMessagCollect': 'P461'
}

const cacheMap = new Map();

//////////////////////////////////////////////////////////////////
// 파일 업로드 관련 클래스

/**
 *  파일 업로드 정보 출력 클래스
 *  streamList = [{
 *    bytesRead: 파일 용량
 *    path: 파일 전체 경로
 *  }]
 */
class FileUploadInfo {
  constructor(streamList) {
    this.streamList = streamList;
    this.totalCount = streamList.length;
    this.currentCount = 0;
    this.accumulatedSize = 0;
  }

  get currentFileName() {
    return this.streamList[this.currentCount].path;
  }

  get currentFileSize() {
    return this.streamList[this.currentCount].size;
  }

  getCurrentProg(info) {

    if (!info) return;

    //console.log(info, this.currentCount, this.currentFileName, this.currentFileSize, this.streamList)

    const curPercent = (info.transferred - this.accumulatedSize) / this.currentFileSize;

    const currentProg = {
      totalCount: this.totalCount,
      currentCount: this.currentCount + 1,
      filePath: this.currentFileName,
      total: this.currentFileSize,
      transferred: info.transferred - this.accumulatedSize,
      percent: curPercent > 1.00 ? 1.00000 : curPercent
    }

    // 현재 파일 용량을 넘었냐?
    if (info.transferred - this.accumulatedSize >= this.currentFileSize) {
      this.accumulatedSize += this.currentFileSize;
      this.currentCount++;

      if (this.currentCount >= this.totalCount) {
        this.currentCount = this.totalCount - 1;
      }
      //console.log('[currentCount]', this.currentCount, info.transferred, this.currentFileSize, )      
    }

    return currentProg;
  }


}

//////////////////////////////////////////////////////////////////

/**
 * DZHttp 모듈을 사용하기 전 꼭 세팅해야 한다.
 * @param {string} mobileId 모바일 아이디
 * @param {string} protocolCheckUrl 프로토콜 확인 URL
 */
async function Init(mobileId, protocolCheckUrl) {
  console.log('init')
  IPCMgr.setGlobalData([{
    name: 'NETINFO\\_mobileId',
    value: mobileId
  },
  {
    name: 'NETINFO\\_protocolCheckUrl',
    value: protocolCheckUrl
  }
  ]);
}

function CreateTransactionId() {
  return require('uuid/v1')();
}

function MakeRequestHeader(pid) {
  const netinfo = IPCMgr.getGlobalData({
    name: 'NETINFO'
  });

  return {
    appType: netinfo['_appType'],
    loginId: netinfo['_loginId'],
    mobileId: netinfo['_mobileId'],
    osType: netinfo['_osType'],
    pid: pid,
    tid: CreateTransactionId(),
    token: netinfo['_token']
  };
}

function MakeRequestJsonBody(pid, bodyData) {
  return {
    header: MakeRequestHeader(pid),
    body: bodyData
  }
}

function getCompanyInfo() {
  const loginInfo = IPCMgr.getGlobalData({
      name: 'LOGININFO'
  });
  //console.log('######### LOGININFO', loginInfo)
  loginInfo.companyList = Object.values(loginInfo.companyList);
  const compInfo = loginInfo.companyList.filter(c => c.compSeq == loginInfo.compSeq && c.bizSeq == loginInfo.bizSeq && c.deptSeq == loginInfo.deptSeq)[0];

  return {
    compSeq: compInfo.compSeq,
    bizSeq: compInfo.bizSeq,
    deptSeq: compInfo.deptSeq,
    emailAddr: compInfo.emailAddr,
    emailDomain: compInfo.emailDomain
  }
}

///////////////////////////////// get,post base 프로토콜 /////////////////////////////////

function reqGetData(url, callback = null) {
  try {
    return require('got').get(url, {
      timeout: 100000,
      headers: {
        'User-Agent': 'Douzone ICT Group PC Messenger'
      },
      hooks: {
        beforeRequest: [
          options => {
            try {
              let _cookies = IPCMgr.getGlobalData({name: 'NETINFO\\_cookies'});
              if (_cookies && _cookies.length > 0) {
                options.headers['Cookie'] = _cookies;
              }
            } catch (err) {
              console.error(err);
            }
          }
        ],
        afterResponse: [
          async response => {
            if (response.headers) {
              const _cookie = response.headers['set-cookie'];
              if (_cookie && _cookie.length > 0) {
                console.log('FIND COOKIE!!!!', _cookie);

                IPCMgr.setGlobalData({
                  name: 'NETINFO\\_cookies',
                  value: _cookie
                });
              }
            }

            if (callback) {
              try {
                callback(response);
              } catch (err) {
                logger.error(err);
              }
            }

            logger.info(`[RESPONSE] ${response.requestUrl}, wait: ${response.timings.phases.wait}, dns: ${response.timings.phases.dns}, tcp: ${response.timings.phases.tcp}, firstByte: ${response.timings.phases.firstByte}, total: ${response.timings.phases.total}, statusCode: ${response.statusCode}`)

            return response;
          }
        ]
      }
    });
  } catch (error) {
    throw error;
  }
}

function reqPostData(pid, data, callback = null, uuid = null) {
  try {
    const _protocolList = IPCMgr.getGlobalData({name: 'NETINFO\\_protocolList'});

    if (!_protocolList[pid]) {
      logger.error('[DZHTTP] _protocolList[pid] is undefined. ErrorCode: ', ErrorCode.FAIL_PID_SEARCH);
      return new Promise(function (resolve, reject) {
        reject({ ErrorCode: ErrorCode.FAIL_PID_SEARCH, pid: pid })
      });
    }

    return require('got').post(_protocolList[pid], {
      body: MakeRequestJsonBody(pid, data),
      json: true,
      timeout: 100000,
      headers: {
        'User-Agent': 'Douzone ICT Group PC Messenger'
      },
      hooks: {
        beforeRequest: [
          options => {
            try {
              let _cookies = IPCMgr.getGlobalData({name: 'NETINFO\\_cookies'});
              if (_cookies && _cookies.length > 0) {
                options.headers['Cookie'] = _cookies;
              }
            } catch (err) {
              console.error(err);
            }
          }
        ],
        afterResponse: [
          async response => {
            if (response.headers) {
              const _cookie = response.headers['set-cookie'];
              if (_cookie && _cookie.length > 0) {
                console.log('FIND COOKIE!!!!', _cookie);

                IPCMgr.setGlobalData({
                  name: 'NETINFO\\_cookies',
                  value: _cookie
                })
              }

              // if (response.statusCode != 200) {
              //     throw new DZError(response.statusMessage, response.statusCode);
              // }

              // const body = JSON.parse(response.body);
              // if (body && body.resultCode != ErrorCode.SUCCESS) {
              //     throw new DZError(body.resultMessage, body.resultCode);
              // }

              if (callback) {
                try {
                  callback(response);
                } catch (err) {
                  logger.error('[PostData ERROR]', err);
                }
              }
            }

            if (uuid) {
              response.uuid = uuid;
            }

            logger.info(`[RESPONSE] ${response.requestUrl}, wait: ${response.timings.phases.wait}, dns: ${response.timings.phases.dns}, tcp: ${response.timings.phases.tcp}, firstByte: ${response.timings.phases.firstByte}, total: ${response.timings.phases.total}, statusCode: ${response.statusCode}`)

            return response;
          }
        ]
      }
    })
      .then(res => {
        if (res.statusCode != 200) {
          throw { ErrorCode: response.statusCode, message: response.statusMessage }
        }

        const body = res.body;
        if (body && body.resultCode != ErrorCode.SUCCESS) {

          throw { ErrorCode: body.resultCode, message: body.resultMessage }
        }

        return res;
      })
      .catch(e => {
        logger.error('[DZHTTP]', e);
        throw e;
      })
  } catch (error) {
    throw error
  }
}

///////////////////////////////// 로그인,메인카운트 프로토콜 /////////////////////////////////

/** 프로토콜 리스트 조회
 * 
 */
function reqGetProtocolList() {
  const netinfo = IPCMgr.getGlobalData({name: 'NETINFO'})
  const _protocolCheckUrl = netinfo['_protocolCheckUrl'];
  const _mobileId = netinfo['_mobileId']
  const _loginId = netinfo['_loginId']
  const url = require('util').format('%s?mobileId=%s&loginId=%s&appType=13&appVer=&osType=03&osVer=&model=', _protocolCheckUrl, _mobileId, _loginId);
  return reqGetData(url).then(res => {
    if (res) {
      const data = JSON.parse(res.body);

      if (res && res.statusCode == 200 && data && data.resultCode == ErrorCode.SUCCESS) {
        // 프로토콜 리스트 생성
        let apiMap = {};
        data.result.protocolList.forEach(x => {
          let {
            protocolId,
            protocolUrl
          } = x;
          apiMap[protocolId] = protocolUrl;
        });

        IPCMgr.setGlobalData({
          name: 'NETINFO\\_protocolList',
          value: apiMap
        });

        return res
      }
    }
  });
}

/** 로그인
 * 
 * @param {string} pwd 로그인 패스워드
 */
async function reqLogin(loginId, pwd) {
  const nicInfo = IPCMgr.getGlobalData({
      name: 'NIC'
  });

  const netInfo = IPCMgr.getGlobalData({
    name: 'NETINFO'
  });

  const res = await reqPostData(PIDS.Login, {
    appType: '13',
    appVer: require('../../../package.json').version,
    deviceId: nicInfo[0].macAddress,
    ipAddress: nicInfo[0].ipAddress,
    loginId: loginId,
    mobileId: netInfo['_mobileId'],
    osType: netInfo['_osType'],
    passwd: pwd
  })

  // statusCode, statusMessage
  // callback 안에서는 아직 함수가 완료된 상태가 아니기 때문에 response body가 string 형태
  const data = res.body

  if (res && res.statusCode == 200 && data) {
    if (data.resultCode == ErrorCode.SUCCESS) {
      let _loginInfo = data.result;

      // make alertList
      const alertDic = _loginInfo.alertList.reduce((a, c) => {
        a[c.eventType + '_' + c.eventSubType] = c.alertYN;
        return a;
      }, {});

      _loginInfo.alertList = alertDic;

      // compDomain
      let compDoamin = _loginInfo.compDomain;
      if (compDoamin && !compDoamin.includes('http://') && !compDoamin.includes('https://')) {
        _loginInfo.compDomain = 'http://' + compDoamin;
      }

      IPCMgr.setGlobalData([{
        name: 'NETINFO\\_loginId',
        value: loginId
      },
      {
        name: 'NETINFO\\_password',
        value: require('crypto').createHash('sha512').update(pwd).digest('base64')
      },
      {
        name: 'NETINFO\\_token',
        value: data.result.token
      },
      {
          name: 'LOGININFO',
          value: _loginInfo
      }
      ])
      
      return res;

    } else {
      throw { ErrorCode: data.resultCode, message: data.resultMessage }
    }
  } else {
    throw { ErrorCode: res.statusCode, message: res.statusMessage }
  }
}

function reqMainCount(orgChartDt, startDate, alertNewYn) {
  return reqPostData(PIDS.MainCount, {
    orgChartDt: orgChartDt,
    startDate: startDate,
    alertNewYn: alertNewYn,
    companyInfo: getCompanyInfo()
  });
}

/** 인사기록카드 궈한 조회
 * 
 * @param {string} empSeq 사원 시퀀스
 * @param {string} compSeq 회사 시퀀스
 * @param {string} targetEmpSeq 조회대상 사원 시퀀스
 */
function reqSearchPersonnelCardInfo(empSeq, compSeq, targetEmpSeq) {
  return reqPostData(PIDS.SearchPersonnelCardInfo, {
    companyInfo: getCompanyInfo(),
    empSeq: empSeq,
    compSeq: compSeq,
    targetEmpSeq: targetEmpSeq
  })
}

///////////////////////////////// 사용자 상태정보 프로토콜 /////////////////////////////////

/** 클라이언트 정보 리스트
 * 
 * @param {string[]} empSeqs 사용자 조회  배열 예) ["3402","4512"] 없을시 해당 앱타입 전체 정보 조회
 */
function reqClientInfoList(empSeqs) {
  return reqPostData(PIDS.ClientInfoList, {
    companyInfo: getCompanyInfo(),
    empSeqs: empSeqs
  })
}

/** 클라이언트 정보 변경
 * 
 * @param {string} type 변경 타입 ("state" :상태구분,  "stateMsg" :상태 메시지) 모바일 state 사용불가
 * @param {string} value 변경 값 : "state" 상태 구분 (0:온라인, 1:자리비움, 2:다른용무중, 3:회의중, 4:통화중, 5:외근중)
 , "stateMsg" 이면 상태 메시지 텍스트)
 */
function reqClientInfoUpdate(type, value) {
  return reqPostData(PIDS.ClientInfoUpdate, {
    companyInfo: getCompanyInfo(),
    type: type,
    value: value
  })
}

///////////////////////////////// 파일 프로토콜 /////////////////////////////////

/** 첨부파일 업로드
 * @param {function} cb 콜백 함수 프로그레스 정보 prog => {percent, transferred, total}
 * @param {Array}  fileList 파일 정보 (배열로 넣어 주세요)
 * @param {string} pathSeq 그룹 파일 경로 시퀀스 - 쪽지: 810 , 대화: 800
 * @param {string} empSeq 사용자 시퀀스
 * @param {string} fileId 첨부파일 아이디(파일 추가시), 신규등록 or 대화방 : ""
 * @param {string} roomId 대화방 아이디(대화방에서 사용), 대화방 아닐시 : ""
 */

function reqAttachFileUpload(fileList, pathSeq, fileId = '', roomId = '', cb = null, uuid = null) {
  // multipart 확인하고 만들자
  // empSeq, toekn 정보 넣어야됨

  try {
    if (!Array.isArray(fileList)) throw Error('배열로 부탁해요~');
    if (fileList.length == 0) throw Error('배열이 비었네요~');

    const _protocolList = IPCMgr.getGlobalData({      
      name: 'NETINFO\\_protocolList'
    });

    const got = require('got');
    const loginInfo = IPCMgr.getGlobalData({
        name: 'LOGININFO'
    });

    const token = IPCMgr.getGlobalData({      
      name: 'NETINFO\\_token'
    });
    const FormData = require('form-data');
    const fs = require('fs');

    const form = new FormData();
    form.append('pathSeq', pathSeq);
    form.append('fileId', fileId);
    form.append('contentType', '1');
    form.append('roomId', roomId);
    form.append('empSeq', loginInfo.empSeq);
    form.append('token', token);

    const filePathArray = [];
    for (let i = 0; i < fileList.length; i++) {
      const readStream = fs.createReadStream(fileList[i].path);
      form.append('file' + i, readStream, fileList[i].name.normalize('NFC'));
      filePathArray.push(fileList[i].path);
    }

    const UploadInfo = new FileUploadInfo(filePathArray.map(f => {
      return {
        path: f,
        size: fs.statSync(f).size
      }
    }))

    return got.post(_protocolList[PIDS.AttachFileUpload], {
      body: form,
      hooks: {
        afterResponse: [
          response => {
            if (uuid) {
              response.uuid = uuid
            }


            return response;
          }
        ]
      }
    })
      .on('uploadProgress', prog => {
        if (cb) {
          //console.log(UploadInfo.getCurrentProg(prog))
          cb(UploadInfo.getCurrentProg(prog));
        }
      })
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * 
 * @param {string} filePath 저장할 파일 위치 fullpath
 * @param {string} fileId 파일 아이디
 * @param {string} fileSn 파일 순번
 * @param {string} pathSeq 쪽지: 810, 대화: 800
 * @param {string} imgSizeType 일반: '', 썸네일: thum
 * @param {string} htmlView HTML 뷰 타입
 * @param {function} cb 다운로드 진행상항
 */
function reqAttachFileDownload(filePath, fileId, fileSn, pathSeq, imgSizeType = '', htmlView = '', cb = null) {
  const netInfo = IPCMgr.getGlobalData({name: 'NETINFO'});
  const _protocolList = netInfo['_protocolList']

  const map = new Map();
  map.set('fileId', fileId);
  map.set('fileSn', fileSn);
  map.set('pathSeq', pathSeq);
  map.set('token', netInfo['_token']);
  map.set('mobileId', netInfo['_mobileId']);
  map.set('imgSizeType', imgSizeType);
  map.set('htmlView', htmlView);

  return fileDownload(_protocolList[PIDS.AttachFileDownload], new URLSearchParams(map), filePath, cb)
}

/**
 * 
 * @param {string} fileId 파일 아이디
 * @param {string} fileSn 파일 순번
 * @param {string} pathSeq 쪽지: 810, 대화: 800
 * @param {string} imgSizeType 일반: '', 썸네일: thum
 * @param {string} htmlView HTML 뷰 타입
 * @param {function} cb 다운로드 진행상항
 */
function reqAttachFileDownloadThumbnail(fileId, fileSn, pathSeq, cb = null) {
  const netInfo = IPCMgr.getGlobalData({name: 'NETINFO'});
  const _protocolList = netInfo['_protocolList']

  const map = new Map();
  map.set('fileId', fileId);
  map.set('fileSn', fileSn);
  map.set('pathSeq', pathSeq);
  map.set('token', netInfo['_token']);
  map.set('mobileId', netInfo['_mobileId']);
  map.set('imgSizeType', 'thum');

  return fileDownloadWithBase64(_protocolList[PIDS.AttachFileDownload], new URLSearchParams(map), cb)
}



/**
 * 파일 다운로드 쿼리 스트링을 만들어 줌
 * @param {string} fileId 파일 아이디
 * @param {string} fileSn 파일 순번
 * @param {string} pathSeq 쪽지 810, 대화 800
 * @param {string} imgSizeType 일반: "", 썸네일: thum
 * @param {string} htmlView HTML 뷰 타입 (document.html : 문서변환원본, hview.html : 문서변환원본+ 가이드 포함)
 */
function makeQueryString(fileId, fileSn, pathSeq, imgSizeType = '', htmlView = '') {
  const netInfo = IPCMgr.getGlobalData({name: 'NETINFO'});

  const map = new Map();
  map.set('fileId', fileId);
  map.set('fileSn', fileSn);
  map.set('pathSeq', pathSeq);
  map.set('token', netInfo['_token']);
  map.set('mobileId', netInfo['_mobileId']);
  map.set('imgSizeType', imgSizeType);
  map.set('htmlView', htmlView);

  return new URLSearchParams(map);
}

/** 첨부파일저장
 * 
 * @param {string} fromPathSeq 
 * @param {string} toPathSeq 
 * @param {string} roomId 
 * @param {string} contentType 
 * @param {Array} fileList 
 */
function reqAttachFileSave(fromPathSeq, toPathSeq, roomId, contentType, fileList) {
  return reqPostData(PIDS.AttachFileSave, {
    companyInfo: getCompanyInfo(),
    fromPathSeq: fromPathSeq,
    toPathSeq: toPathSeq,
    roomId: roomId,
    contentType: contentType,
    fileList: fileList
  })
}

/** direct 다운로드
 * 
 * @param {string} url 파일 다운로드 url \
 * 프로토콜 URL : http://도메인/upload/ \
 * 프로필사진 /img/profile/demo/4456.jpg?fileId=1234
 */
function reqDirectDownload(url) {
  return reqGetData(url);
}
/** 출퇴근 리퀘스트_GET
 * 
 * @param {string} url 출퇴근 url \
 */
function reqGetComeLeave(url) {
  return reqGetData(url);
}
/** 출퇴근 리퀘스트_POST
 * 
 * @param {string} url target url \
 * @param {string} data json data \
 */
function reqPostComeLeave(url, data) {
  return reqPostData(url, data)
}
///////////////////////////////// 대화방 프로토콜 /////////////////////////////////

/** 대화방 리스트 조회
 * 
 * @param {string} timeStamp 조회 기준 시간 (0 : 최초,  기준 TimeStmap)
 * @param {string} reqType 요청 타입 ( "1" : 기준 시간 이전(최근), "2" : 기준 시간 이후(과거)  ) 미 입력시 "1"
 * @param {string} reqSubType 기준시간 정보 포함여부 ("Y" : 포함, "N" : 미포함)
 * @param {string} searchType 대화방 구분 (A: 일반, B:프로젝트, C:즐겨찾기)
 * @param {string} pageSize 요청 개수
 */
function reqSearchRoomList(timeStamp, reqType, reqSubType, searchType, pageSize) {
  return reqPostData(PIDS.SearchRoomList, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    reqType: reqType,
    reqSubType: reqSubType,
    searchType: searchType,
    pageSize: pageSize
  });
}

/** 대화방 생성
 * 
 * @param {string} roomType 대화방 구분 (1: 일반(1:1), 2 : 일반(그룹), 4:프로젝트 대화방)
 * @param {string[]} receiver 대화 참여자 리스트 [empSeq, empSeq ...]
 * @param {string} projectId 프로젝트 아이디 (프로젝트 대화방일 경우) 없을경우 ""
 * @param {string} roomTitle 프로젝트 명, 일반대화방 일경우 대화방명  없을경우 ""
 */
function reqInsertRoom(roomType, receiver, projectId, roomTitle) {
  return reqPostData(PIDS.InsertRoom, {
    companyInfo: getCompanyInfo(),
    roomType: roomType,
    receiver: receiver,
    projectId: projectId,
    roomTitle: roomTitle
  })
}

/** 대화 보내기
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} empName 보낸 사용자 명 (메시지 처리용)
 * @param {string} content 대화 내용 (파일 전송시 "")
 * @param {string} contentType 대화 구분 (0:일반대화(텍스트), 1:첨부파일, 2:첨부파일(음성), 3:링크, 4:이모티콘, 5 : 동영상, 6: 게임)
 * @param {string} emoticonId 이모티콘 아이디 (ex 001_01)
 * @param {object} link 링크 정보 (연결하기) 없으면 null
 * @param {string[]} recvMentionEmpList 멘션 대상자 리스트
 */
function reqChatSend(roomId, empName, content, contentType, emoticonId, link, recvMentionEmpList, talkSecuYn, uuid = null) {
  return reqPostData(PIDS.ChatSend, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    empName: empName,
    content: content.normalize('NFC'),
    contentType: contentType,
    emoticonId: emoticonId,
    link: link,
    recvMentionEmpList: recvMentionEmpList,
    talkSecuYn: talkSecuYn
  }, null, uuid)
}

/** 대화방상세
 * 
 * @param {string} roomId 대화방 아이디
 */
function reqRoomDetail(roomId) {
  return reqPostData(PIDS.RoomDetail, {
    companyInfo: getCompanyInfo(),
    roomId: roomId
  })
}

/** 대화 검색
 * 
 * @param {string} timeStamp 조회 기준시간 (0 : 최초,  기준 TimeStmap)
 * @param {string} roomId 대화방 아이디 (특정 대화방 내 검색시)
 * @param {string} searchKind 검색 종류 ("1": 발신자, "2": 내용, "3": 수신자, "4": 첨부파일명)
 * @param {string} searchType 대화방 구분 ("A": 일반, "B": 프로젝트, C:즐겨찾기)
 * @param {string} searchWord 검색어(검색종류 2(내용), 4:첨부아일명) 일경우)
 * @param {string[]} searchEmpSeq 검색 사용자시퀀스 (검색종류 1(발신자), 3(수신자) 일 경우) 예)["3402","4512"]
 * @param {string} pageSize 요청 개수
 */
function reqSearchChatList(timeStamp, roomId, searchKind, searchType, searchWord, searchEmpSeq, pageSize) {
  return reqPostData(PIDS.SearchChatList, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    roomId: roomId,
    searchKind: searchKind,
    searchType: searchType,
    searchWord: searchWord,
    searchEmpSeq: searchEmpSeq,
    pageSize: pageSize
  })
}

/** 대화 리스트 조회
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} timeStamp 조회 기준시간 (0 : 최초,  기준 TimeStmap)
 * @param {string} reqType 요청 타입 ( "1" : 최근, "2" : 과거  ) 미 입력시 "1"
 * @param {string} reqSubType 기준시간 정보 포함여부 ("Y" : 포함, "N" : 미포함)
 * @param {string} pageSize 요청 개수 
 */
async function reqChatList(roomId, timeStamp, reqType, reqSubType, pageSize) {
  let _chatListResponse = await reqPostData(PIDS.ChatList, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    timeStamp: timeStamp,
    reqType: reqType,
    reqSubType: reqSubType,
    pageSize: pageSize
  })
  if (_chatListResponse.body.resultMessage === "SUCCESS") {
    _chatListResponse.body.result.chatList.forEach(
      c => {
        if (c.talkSecuYn === 'Y' && c.content) {
          c.content = require('./DZEncrypt').DecryptSecuMsg(c.roomId, c.content, false)
        }
      }
    )
  }
  return _chatListResponse
}

/** 프로젝트 대화방 검색
 * 
 * @param {string} timeStamp 
 * @param {string} searchWord 
 * @param {string} pageSize 
 */
function reqSearchProjectRoomList(timeStamp, searchWord, pageSize) {
  return reqPostData(PIDS.SearchProjectRoomList, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    searchWord: searchWord,
    pageSize: pageSize
  })
}

/** 대화 읽은 사용자 리스트
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} chatId 대화 아이디
 */
function reqChatReadUserList(roomId, chatId) {
  return reqPostData(PIDS.ChatReadUserList, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    chatId: chatId
  })
}

/** 대화방 초대하기
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} empName 초대자 이름
 * @param {string[]} receiver 초대받을 사용자 리스트 [empSeq, empSeq ...]
 */
function reqRoomIn(roomId, empName, receiver) {
  return reqPostData(PIDS.RoomIn, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    empName: empName,
    receiver: receiver
  })
}

/** 대화방 나가기
 * 
 * @param {string[]} roomList 대화방 리스트
 * @param {string} empName 나간 사용자 명 (메시지 처리용)
 * @param {string} positionName 나간 사용자 직급 (메시지 처리용)
 * @param {string} roomtalkDelYn 대화목록삭제 Y(삭제):N(삭제안함)
 */
function reqRoomOut(roomList, empName, positionName, roomtalkDelYn) {
  return reqPostData(PIDS.RoomOut, {
    companyInfo: getCompanyInfo(),
    roomList: roomList,
    empName: empName,
    positionName: positionName,
    roomtalkDelYn: roomtalkDelYn
  })
}

/** 대화방명 변경
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} roomTitle 대화방 명
 * @param {string} roomType 대화방 구분 (1: 일반(1:1), 2 : 일반(그룹), 3:시스템, 4:프로젝트)
 */
function reqRoomTitleUpdate(roomId, roomTitle, roomType) {
  return reqPostData(PIDS.RoomTiltleUpdate, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    roomTitle: roomTitle,
    roomType: roomType
  })
}

/** 대화방 알림 설정
 * 
 * @param {string} roomId 대화방 아이디
 * @param {string} roomAlarmYn 대화방 알림 여부 (Y/N)
 */
function reqRoomAlarm(roomId, roomAlarmYn) {
  return reqPostData(PIDS.RoomAlarm, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    roomAlarmYn: roomAlarmYn
  })
}

/** 대화 삭제
 * 
 * @param {Array} delList 삭제 대화 리스트
 */
function reqChatDelete(delList) {
  return reqPostData(PIDS.ChatDelete, {
    companyInfo: getCompanyInfo(),
    delList: delList
  })
}

/**
 * 
 * @param {List<String>} delList 삭제(회수) 대화아이디 리스트
 *                               단일 값 ["대화 아이디","대화 아이디"]
 * @param {String} roomId 대화방 아이디
 * @param {String} collectType 0 : 내가 보낸 메시지 삭제 불가
                               1 : 내가 보낸 메시지 삭제 가능
                               2 : 내가 보낸 메시지 중 상대방이 읽지 않은 경우만 삭제 가능
 */
function reqChatCollect(delList, roomId, collectType) {
  return reqPostData(PIDS.TalkMessagCollect, {
    companyInfo: getCompanyInfo(),
    delList: delList,
    roomId: roomId,
    collectType: collectType
  })
}

/** 특정 대화방 조회
 * 
 * @param {string} roomId 대화방 아이디
 */
function reqSearchRoomInfo(roomId) {
  return reqPostData(PIDS.SearchRoomInfo, {
    companyInfo: getCompanyInfo(),
    roomId: roomId
  })
}

/** 대화방 확인
 * 
 * @param {string[]} receiver 대화방 아이디
 * @param {string} roomType 대화방 구분 (1: 일반(1:1), 2 : 일반(그룹))
 */
function reqRoomCheck(receiver, roomType) {
  return reqPostData(PIDS.RoomCheck, {
    companyInfo: getCompanyInfo(),
    receiver: receiver,
    roomType: roomType
  })
}


/** 특정 대화방 검색 (대화방명 검색) 
 * @param {string} timeStamp 조회 기준시간 (0 : 최초, 기준 TimeStamp)
 * @param {string} searchType 조회 구분 ("A": 일반, "B": 프로젝트, C:즐겨찾기)
 * @param {string} searchWord 검색어 (대화방 명)
 * @param {string} pageSize 요청 개수
 */
function reqSearchRoomListNew(timeStamp, searchType, searchWord, pageSize) {
  return reqPostData(PIDS.SearchRoomListByRoomName, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    searchType: searchType,
    searchWord: searchWord,
    pageSize: pageSize
  })
}

/** 대화방 즐겨찾기 설정
 * @param {string[]} roomIds 대화방 아이디 배열 예) ["ADF@hu1","A1kADJ"]
 * @param {string} markYn 즐겨찾기 여부 (Y/N)
 */
function reqRoomMark(roomIds, markYn) {
  return reqPostData(PIDS.RoomMarkNew, {
    companyInfo: getCompanyInfo(),
    roomIds: roomIds,
    markYn: markYn
  })
}

/** 대화 읽음 처리
 * 
 * @param {string} searchType 조회 구분 (A: 일반, B:프로젝트, C:즐겨찾기)
 * @param {string} allReadyn 모두읽음 여부 (Y: 모두읽음 처리, N: 선택읽음 처리)
 * @param {string[]} roomIds 선택 읽음시 대화방 아이디 배열 예) ["ADF@hu1","A1kADJ"]
 */
function reqChatRead(searchType, allReadYn, roomIds) {
  return reqPostData(PIDS.ChatRead, {
    companyInfo: getCompanyInfo(),
    searchType: searchType,
    allReadYn: allReadYn,
    roomIds: roomIds
  })
}

/** 대화방 파일 모아보기 
 * @param {string} roomId 대화방 아이디
 * @param {string} fileType 첨부파일 타입 (I:이미지, M:멀티미디어,D:문서, O:기타) , 미입력하거나 잘못입력한경우 "전체조회"
 * @param {string} timeStamp 조회 기준시간 (0 : 최초,  기준 TimeStmap)
 * @param {string} searchWord 검색어 (첨부파일명)
 * @param {string} pageSize 요청 개수
 */
function reqRoomFileList(roomId, fileType, timeStamp, searchWord, pageSize) {
  return reqPostData(PIDS.RoomFileList, {
    companyInfo: getCompanyInfo(),
    roomId: roomId,
    fileType: fileType,
    timeStamp: timeStamp,
    searchWord: searchWord,
    pageSize: pageSize
  })
}

/** 전체 대화 삭제
 * 
 * @param {string[]} roomIdList 대화방 아이디 리스트
 */
function reqAllChatClear(roomIdList) {
  return reqPostData(PIDS.AllChatClear, {
    companyInfo: getCompanyInfo(),
    roomIdList: roomIdList
  })
}

/** 대화 핀고정 등록/취소
 * 
 * @param {obect[]} roomList 등록 취소 대화방 목록 \
 * [roomList 구조] \
 * roomId string 대화방 아이디 \
 * roomType string 대화방 구분 (1: 일반(1:1), 2 : 일반(그룹), 4:프로젝트 대화방) \
 * pinUpYn string 대화방 핀 고정 유무(Y 등록:N 미 등록) \
 * searchType string 대화방 조회 구분 (A: 일반, B:프로젝트, C:즐겨찾기)
 */
function reqRoomPinUpYn(roomList) {
  return reqPostData(PIDS.RoomPinUpYn, {
    companyInfo: getCompanyInfo(),
    roomList: roomList
  })
}

/** 대화방 대화 단건 조회
 * 
 * @param {string} chatId 
 */
function reqTalkChatInfo(chatId) {
  return reqPostData(PIDS.TalkChatInfo, {
    chatId: chatId
  })
}

///////////////////////////////// 마이그룹 프로토콜 /////////////////////////////////

function reqMyGroupList() {
  return reqPostData(PIDS.MyGroupList, {
    companyInfo: getCompanyInfo()
  })
}

function reqMyGroupInsert(myGroupName) {
  return reqPostData(PIDS.MyGroupInsert, {
    companyInfo: getCompanyInfo(),
    myGroupName: myGroupName
  })
}

function reqMyGroupUpdate(myGroupId, myGroupName) {
  return reqPostData(PIDS.MyGroupUpdate, {
    companyInfo: getCompanyInfo(),
    myGroupId: myGroupId,
    myGroupName: myGroupName
  })
}

function reqMyGroupDelete(delList) {
  return reqPostData(PIDS.MyGroupDelete, {
    companyInfo: getCompanyInfo(),
    delList: delList
  })
}

function reqMyGroupMemberInsert(myGroupId, members) {
  return reqPostData(PIDS.MyGroupMemberInsert, {
    companyInfo: getCompanyInfo(),
    myGroupId: myGroupId,
    members: members
  })
}

/**
 * 마이그룹 구성원 삭제
 * @param {array} delList 마이그룹 리스트 (삭제 그룹의 구성원) \
 * delList	myGroupId	strng	마이그룹 그룹 아이디 \
 *          members	    array	구성원 리스트 \
　	　	　
   members	deptSeq	string	부서 시퀀스 \
            empSeq	string	사용자 시퀀스
 */
function reqMyGroupMemberDelete(delList) {
  return reqPostData(PIDS.MyGroupMemberDelete, {
    companyInfo: getCompanyInfo(),
    delList: delList
  })
}

///////////////////////////////// 쪽지 프로토콜 ////////////////////////////////////

/** 쪽지 회수
 * 
 * @param {string} msgId 쪽지 아이디
 */
function reqMessageCollect(msgId) {
  return reqPostData(PIDS.MessageCollect, {
    msgId: msgId
  })
}

/** 쪽지 안읽음 수 조회
 * 
 */
function reqMessageUnReadCount() {
  return reqPostData(PIDS.MessageUnReadCnt, {
    companyInfo: getCompanyInfo()
  })
}

/** 쪽지 리스트 조회
 * 
 * @param {string} timeStamp 조회 기준 시간 (0 : 최초,  기준 TimeStmap)
 * @param {string} reqType 요청 타입 ( "1" : 기준 시간 이전(최근), "2" : 기준 시간 이후(과거)  ) 미 입력시 "1"
 * @param {string} reqSubType 기준시간 정보 포함여부 ("Y" : 포함, "N" : 미포함)
 * @param {string} searchType 조회 타입 ("0":"전체쪽지", "1": 보낸쪽지, "2": 받은쪽지, "3":미열람, "4":관심쪽지, "5":예약쪽지) \
 *                            검색종류 0:전체  내용,첨부파일 검색되며,  2글자 이상시 사용자명 (받은, 보낸) 검색 추가됨
 * @param {string} searchKind 검색 종류 ("1": 발신자, "2": 내용, "3":수신자, "4":첨부파일명) 없을경우 ""
 * @param {string} searchWord 검색어 (검색종류 2(내용), 4(첨부파일명) 일 경우) 없을경우 ""
 * @param {string[]} searchEmpSeq 검색 사용자시퀀스 (검색종류 1(발신자), 3(수신자) 일 경우) 예)["3402","4512"] 없을경우 []
 * @param {string} pageSize 요청 개수
 */
function reqMessageList(timeStamp, reqType, reqSubType, searchType, searchKind, searchWord, searchEmpSeq, pageSize) {
  return reqPostData(PIDS.MessageList, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    reqType: reqType,
    reqSubType: reqSubType,
    searchType: searchType,
    searchKind: searchKind,
    searchWord: searchWord,
    searchEmpSeq: searchEmpSeq,
    pageSize: pageSize
  })
}

/** 쪽지 상세
 * 
 * @param {string} msgId 쪽지 아이디
 * @param {string} msgType 쪽지 타입 ("1": 보낸쪽지, "2": 받은쪽지)
 * @param {string} passWord 보안 쪽지시 암호화된 패스워드(SHA256), 보안쪽지가 아닐경우 ""
 * @param {string} searchType 조회 타입 ("1": 보낸쪽지, "2": 받은쪽지, "3":미열람 목록, "4":관심쪽지, "5":예약쪽지)
 */
function reqMessageDetail(msgId, msgType, passWord, searchType) {
  return reqPostData(PIDS.MessageDetail, {
    companyInfo: getCompanyInfo(),
    msgId: msgId,
    msgType: msgType,
    passWord: passWord,
    searchType: searchType
  })
}

/** 쪽지 전송
 * 
 * @param {string[]} recvEmpSeq 받은 사람 시퀀스 배열 예) ["3402","4512"]
 * @param {string} content 쪽지 내용(파일만 전송시 "")
 * @param {string} fileId 첨부 파일 아이디 , 없을경우 ""
 * @param {string} secuYn 보안 쪽지 여부 (Y/N)
 * @param {string} receiptYn 수신 확인 여부 (Y/N)
 * @param {string} reserveDate 예약 쪽지 시간 (yyyyMMddHHmmss), 일반쪽지일 경우 ""
 * @param {string} linkMsgId 회신시 원본 쪽지 아이디, 회신이 아닌경우 ""
 * @param {string} msgId 예약쪽지수정시만 (수정할 쪽지아이디) 그외 ""
 * @param {string} encryptionYn 보안 쪽지 암호화 여부 (Y/N)
 * @param {string} contentType 내용 구분  (0:일반(텍스트), 1:첨부파일, 2:첨부파일(음성))  없을경우 9 :일반
 */
function reqSendMessage(recvEmpSeq, content, fileId = '', secuYn = 'N', receiptYn = 'N', reserveDate = '', linkMsgId = '', msgId = '', encryptionYn = 'N', contentType = '0') {

  if (fileId) {
    contentType = '1';
  }

  return reqPostData(PIDS.SendMessage, {
    companyInfo: getCompanyInfo(),
    recvEmpSeq: recvEmpSeq,
    content: content ? content.normalize('NFC') : content,
    contentType: contentType,
    secuYn: secuYn,
    receiptYn: receiptYn,
    reserveDate: reserveDate,
    fileId: fileId,
    link: [],
    linkMsgId: linkMsgId,
    msgId: msgId,
    encryptionYn: encryptionYn
  })
}

/** 쪽지 삭재
 * 
 * @param {string[]} sendMsgids 삭제 할 보낸 쪽지 배열 예) ["3402","4512"]
 * @param {string[]} recvMsgIds 삭제 할 받은 쪽지 배열 예) ["3402","4512"]
 * @param {string[]} reserveMsgids 삭제 할 예약 쪽지 배열 예) ["3402","4512"]
 */
function reqMessageDelete(sendMsgIds, recvMsgIds, reserveMsgIds) {
  return reqPostData(PIDS.MessageDelete, {
    companyInfo: getCompanyInfo(),
    sendMsgIds: sendMsgIds,
    recvMsgIds: recvMsgIds,
    reserveMsgIds: reserveMsgIds
  })
}

/** 쪽지 읽음 처리
 * 
 * @param {string} msgIds 쪽지 배열 예) ["3402","4512"] 선택 쪽지만
 * @param {string} allReadYn 모두읽음일 경우 'Y' 그외 'N'
 */
function reqMessageRead(msgIds, allReadYn) {
  return reqPostData(PIDS.MessageRead, {
    companyInfo: getCompanyInfo(),
    msgIds: msgIds,
    allReadYn: allReadYn
  })
}

/** 쪽지 수신확인 리스트 
 * 
 * @param {string} msgId 쪽지 아이디
 */
function reqMessageRecvList(msgId) {
  return reqPostData(PIDS.MessageRecvList, {
    companyInfo: getCompanyInfo(),
    msgId: msgId
  })
}

/** 관심 쪽지 처리
 * 
 * @param {string} msgId 쪽지 아이디
 * @param {string} msgType 쪽지 타입 ("1": 보낸쪽지, "2": 받은쪽지)
 * @param {string} markYn 관심 쪽지 여부 (Y/N)
 */
function reqMessageMark(msgId, msgType, markYn) {
  return reqPostData(PIDS.MessageMark, {
    companyInfo: getCompanyInfo(),
    msgId: msgId,
    msgType: msgType,
    markYn: markYn
  })
}

/** 예약 쪽지 취소 처리
 * 
 * @param {string[]} msgIds 취소할 예약 쪽지 배열 예) ["3402","4512"] \
 * 예약 취소시 발송 취소 되며, 예약 리스트 에서 제외 됨
 */
function reqReserveMessageCancel(msgIds) {
  return reqPostData(PIDS.MessageCancel, {
    companyInfo: getCompanyInfo(),
    msgIds: msgIds
  })
}

/** 예약쪽지 상태 변경
 * 
 * @param {string} msgId 쪽지 아이디
 * @param {string} status 예약쪽지 상태 값("-1":발송취소, "0":발송대기)
 * @param {string} reserveDate 발송 대기로 전환시 필수(yyyyMMddHHmmss ex: 20170418134300)
 */
function reqReserveMessageStatus(msgId, status, reserveDate) {
  return reqPostData(PIDS.ReserveMessageStatus, {
    companyInfo: getCompanyInfo(),
    msgId: msgId,
    status: status,
    reserveDate: reserveDate
  })
}
///////////////////////////////// 링크(SSO) 프로토콜 ////////////////////////////////////

/** 링크 메뉴 버전
 * 
 */
function reqSearchMsgMenuVer() {
  return reqPostData(PIDS.MsgLinkVer, {
    companyInfo: getCompanyInfo()
  })
}

/** 링크메뉴 리스트
 * 
 */
function reqSearchMsgMenuList() {
  return reqPostData(PIDS.MsgLinkList, {
    companyInfo: getCompanyInfo()
  })
}

/** 링크메뉴 SSO Token
 * 
 * @param {string} linkType 링크 구분("L": 메뉴링크, "A": 알림링크, "R": 대화방링크, "B" : 최근공지게시)
 * @param {string} lSeq 시퀀스("L": linkSeq, "A": alertSeq, "R": 0, "B":0)
 * @param {string} eventType 이벤트 타입(대화방링크시 사용)
 * @param {string} eventSubType 이벤트 하위 타입(대화방링크시 사용)
 * @param {string} urlPath 페이지 이동 URL(대화방링크시 사용), 최근 공지게시 - (url?art_seq_no=게시물번호(artNo) 로 전달되어야함)
 * @param {string} seq 알림 시퀀스
 * @param {string} subSEq 알림 서브 시퀀스
 */
function reqSearchMsgLinkToken(linkType, lSeq, eventType, eventSubType, urlPath, seq = null, subSeq = null) {
  const nicInfo = require('./IPCController').getGlobalData({
      name: 'NIC'
  });

  return reqPostData(PIDS.MsgLinkToken, {
    companyInfo: getCompanyInfo(),
    linkType: linkType,
    lSeq: lSeq,
    eventType: eventType,
    eventSubType: eventSubType,
    urlPath: urlPath,
    seq: seq,
    subSeq: subSeq,
    userIP: nicInfo[0].ipAddress
  })
}

///////////////////////////////// 통합알림 프로토콜 ////////////////////////////////////

/** 알림 카운트 조회
 * 
 * @param {string} mentionYn 멘션만 조회 유무(Y : 멘션 리스트만 조회, N: 전체) default : "N"
 * @param {string} eventType 조회하고자 하는 이벤트 타입. default : ""
 */
function reqAlertCntNew(mentionYn, eventType) {
  return reqPostData(PIDS.AlertCntNew, {
    companyInfo: getCompanyInfo(),
    mentionYn: mentionYn,
    eventType: eventType
  })
}

/** 알림 리스트 조회
 * 
 * @param {string} timeStamp 최근동기화시간 - (밀리초)
 * @param {string} reqType 요청 타입 ( "1" : 최근, "2" : 과거  )  default : "2"
 * @param {string} reqSubType 기준시간 정보 포함여부 ("Y" : 포함, "N" : 미포함) default : "N"
 * @param {string} pageSize 요청 개수
 * @param {string} newYn 미확인 리스트 여부(Y:미확인 리스트만 조회, N:전체)  default : "N"
 * @param {string} mentionYn 멘션 리스트만 조회 유무(Y : 멘션 리스트만 조회, N: 전체) default : "N"
 * @param {string} eventType 조회하고자 하는 이벤트 타입. default : ""
 */
function reqAlertListNew(timeStamp, reqType, reqSubType, pageSize, newYn, mentionYn, eventType) {
  return reqPostData(PIDS.AlertListNew, {
    companyInfo: getCompanyInfo(),
    timeStamp: timeStamp,
    reqType: reqType,
    reqSubType: reqSubType,
    pageSize: pageSize,
    newYn: newYn,
    mentionYn: mentionYn,
    eventType: eventType
  })
}

/** 알림 읽음 처리
 * 
 * @param {string[]} alertIds 읽음 처리할 알림 시퀀스 리스트
 */
function reqAlertReadNew(alertIds) {
  return reqPostData(PIDS.AlertReadNew, {
    companyInfo: getCompanyInfo(),
    alertIds: alertIds
  })
}

/** 모두 알림 읽음 처리
 * 
 * @param {string} mentionYn 멘션만 읽음처리할지 여부 \
                            "ALL" : 일반알림 과 멘션 알림 모두 읽음처리 \
                            "MENTION" : 알파 멘션만 모두 읽음처리 \
                            "ALERT" : 일반 알림만 모두 읽음처리 \
 * @param {string} eventType 모두 읽음 처리할 특정 유형 지정. default ""(모두)
 */
function reqAlertReadAllNew(mentionYn, eventType) {
  return reqPostData(PIDS.AlertReadAllNew, {
    companyInfo: getCompanyInfo(),
    mentionYn: mentionYn,
    eventType: eventType
  })
}

//////////////////////////////// 하단 공지 사항 ///////////////////////////////////

function reqBoardList(url) {
  try {

    const loginInfo = IPCMgr.getGlobalData({
        name: 'LOGININFO'
    });

    return require('got').post(url, {
      body: {
        header: {
          groupSeq: loginInfo.groupSeq,
          loginId: loginInfo.loginId,
          pId: '',
          tId: ''
        },
        body: {
          langCode: loginInfo.nativeLangCode,
          companyInfo: {
            compSeq: loginInfo.compSeq,
            bizSeq: loginInfo.bizSeq,
            deptSeq: loginInfo.deptSeq
          }
        }
      },
      json: true,
      timeout: 100000,
      headers: {
        'User-Agent': 'Douzone ICT Group PC Messenger'
      },

    })
  } catch (error) {
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////////////

async function Login(loginId, password, cloudID = null) {
  try {
    if (cloudID) {
      IPCMgr.setGlobalData({
        name: 'NETINFO\\_mobileId',
        value: cloudID
      })
    }
    //f(_initOk == false) throw Error('DZHttp 모듈이 초기화 되지 않았습니다.');

    // _loginId = loginId;        
    // _password = crypto.createHash('sha512').update(password).digest('base64');        
    // call getprotocol
    await reqGetProtocolList();

    // call login
    await reqLogin(loginId, password);
    // call main count        
    const mainCountRes = await reqMainCount('', require('moment')().format('YYYYMMDD'), 'Y');

    //call message menu list
    let menuList = await reqSearchMsgMenuList();

    return {
      mainCntInfo: mainCountRes.body,
      msgMenuInfo: menuList.body
    };

  } catch (error) {
    console.error(error);
    throw error
  }
}

///////////////////////////////// 파일 다운로드/업로드 //////////////////////////////////////

/**
 * 파일 다운로드
 * @param {string} url 파일 다운로드 url
 * @param {string} path 저장할 경로
 * @param {callback function} cb 진행 상태 정보 (percent, transferred, total: body 사이즈를 알 수 없을 경우에는 null)
 */
function fileDownload(url, query, path, cb) {
  return new Promise((resolve, reject) => {
    try {
      const got = require('got');
      const fs = require('fs');
      got.post(url, {
        headers: {
          'User-Agent': 'Douzone ICT Group PC Messenger'
        },
        body: query,
        form: true,
        stream: true
      })
        .on('downloadProgress', prog => {
          if (cb) {
            cb(prog)
          }
        })
        .pipe(fs.createWriteStream(path))
        .on('finish', () => {
          resolve();
        })


    } catch (err) {
      console.error(err);
      reject(err);
    }
  })
}

/**
 * 
 * @param {string} url 다운로드 url
 * @param {object} query 
 * @param {function} cb 
 */
function fileDownloadWithBase64(url, query, cb) {

  const got = require('got');
  const fs = require('fs');
  return got.post(url, {
    headers: {
      'User-Agent': 'Douzone ICT Group PC Messenger'
    },
    body: query,
    form: true,
    encoding: 'base64',
    cache: cacheMap
  })
    .on('downloadProgress', prog => {
      if (cb) {
        cb(prog)
      }
    })
}

/**
 * 조직도 다운로드
 * @param {string} url 
 */
async function orgDownload(url) {

  console.log('[dzhttp]', url);

  const path = require('path');
  const fs = require('fs');

  let filePath = require('./CommonUtils').getDBPath();
  logger.info('[DB PATH]', filePath);

  const unzipFileName = path.join(filePath, 'BizBoxAOrg.sqlite');
  const backupFileName = path.join(filePath, 'BizBoxAOrg.sqlite.bak');
  filePath = path.join(filePath, 'BizboxAOrg.zip');

  const response = await require('got').stream(url, {
    headers: {
      'User-Agent': 'Douzone ICT Group PC Messenger'
    },
    hooks: {
      beforeRequest: [
        options => {
          try {
            let _cookies = IPCMgr.getGlobalData({name: 'NETINFO\\_cookies'})
            if (_cookies && _cookies.length > 0) {
              options.headers['Cookie'] = _cookies;
            }
          } catch (err) {
            console.error(err);
          }
        }
      ],
      afterResponse: [
        async response => {
          if (response.headers) {
            const _cookie = response.headers['set-cookie'];
            if (_cookie && _cookie.length > 0) {
              console.log('FIND COOKIE!!!!', _cookie);

              IPCMgr.setGlobalData({
                name: 'NETINFO\\_cookies',
                value: _cookie
              });
            }

            if (response.statusCode != 200) {

              throw { ErrorCode: response.statusCode, message: response.statusMessage }
            }

            const body = JSON.parse(response.body);
            if (body && body.resultCode != ErrorCode.SUCCESS) {

              throw { ErrorCode: body.resultCode, message: body.resultMessage }
            }

            if (callback) {
              try {
                callback(response);
              } catch (err) {
                throw err;
              }
            }
          }
          return response;
        }
      ]
    }
  });

  let isFileDownCompleted = false;
  // const writable = fs.createWriteStream(filePath);    

  // response.on('data', (chunk) => {
  //     writable.write(chunk);
  // });

  // response.on('end', () => {
  //     console.log('write end');
  //     writable.end();

  //     isFileDownCompleted = true;
  // })

  response
    .pipe(fs.createWriteStream(filePath))
    .on('finish', () => {
      console.log('write end');
      isFileDownCompleted = true;
    })


  // 파일이 다운되는 동안 기다려..
  while (!isFileDownCompleted) {
    console.log('file download not yet...')
    await sleep(500);
  }

  // 파일 다운로드 완료 이벤트가 발생하여도 파일이 써지는데 시간이 살짝 필요하다.
  await sleep(500);

  console.log('sleep is end...');

  if (fs.existsSync(filePath)) {

    try {
      //backup
      if (fs.existsSync(backupFileName)) {
        fs.unlinkSync(backupFileName);
      }

      if (fs.existsSync(unzipFileName)) {
        fs.renameSync(unzipFileName, backupFileName);
      }

      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(filePath);
        const entryList = zip.getEntries();
        for (let i = 0; i < entryList.length; i++) {
          const orgWritable = fs.createWriteStream(unzipFileName);
          const fileBuff = zip.readFile(entryList[i]);
          orgWritable.write(fileBuff);
          orgWritable.end();
        }
      } catch (err) {
        console.error(err);
        throw err;
      }
    } catch (err) {

      // rallback
      if (fs.existsSync(unzipFileName)) {
        fs.unlink(unzipFileName);
      }

      if (fs.existsSync(backupFileName)) {
        fs.renameSync(backupFileName, unzipFileName);
      }

      console.error(err);
      throw err;
    }

    fs.unlinkSync(filePath);

    return true;

  } else {
    return false;
  }
}

//////////////////////////////////// 기타 ////////////////////////////////////

/**
 * 슬립.. 잠시만 기다려~~
 * @param {int} ms 슬립 시간
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export {
  Init,
  Login,
  orgDownload,
  fileDownload,
  makeQueryString,

  reqGetProtocolList,
  reqLogin,
  reqMainCount,
  reqSearchPersonnelCardInfo,

  reqClientInfoList,
  reqClientInfoUpdate,

  reqAttachFileUpload,
  reqAttachFileDownload,
  reqAttachFileDownloadThumbnail,
  reqAttachFileSave,
  reqDirectDownload,
  reqGetComeLeave,
  reqPostComeLeave,

  reqSearchRoomList,
  reqInsertRoom,
  reqChatSend,
  reqRoomDetail,
  reqSearchChatList,
  reqChatList,
  reqSearchProjectRoomList,
  reqChatReadUserList,
  reqRoomIn,
  reqRoomOut,
  reqRoomTitleUpdate,
  reqRoomAlarm,
  reqChatDelete,
  reqChatCollect,
  reqSearchRoomInfo,
  reqRoomCheck,
  reqSearchRoomListNew,
  reqRoomMark,
  reqChatRead,
  reqRoomFileList,
  reqAllChatClear,
  reqRoomPinUpYn,
  reqTalkChatInfo,

  reqMyGroupList,
  reqMyGroupInsert,
  reqMyGroupUpdate,
  reqMyGroupDelete,
  reqMyGroupMemberInsert,
  reqMyGroupMemberDelete,

  reqMessageCollect,
  reqMessageUnReadCount,
  reqMessageList,
  reqMessageDetail,
  reqSendMessage,
  reqMessageDelete,
  reqMessageRead,
  reqMessageRecvList,
  reqMessageMark,
  reqReserveMessageCancel,
  reqReserveMessageStatus,

  reqSearchMsgMenuVer,
  reqSearchMsgMenuList,
  reqSearchMsgLinkToken,

  reqAlertCntNew,
  reqAlertListNew,
  reqAlertReadNew,
  reqAlertReadAllNew,

  reqBoardList,

  CreateTransactionId,

  PIDS
}
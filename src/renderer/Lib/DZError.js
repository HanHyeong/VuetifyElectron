const ErrorCode = {
  SUCCESS: '0',
  NO_DATA: 'UC0000',
  FAIL_PID_SEARCH: 'UC0001',
  PROBLEM_NOTIFY_SETUP: 'UC4000',
  PROBLEM_ATTACH_FILE_INFO_SAVE: 'UC5000',
  PROBLEM_ATTACH_FILE_SAVE: 'UC5001',
  PROBLEM_MAIN_COUNT_SEARCH: 'UC5002',
  PROBLEM_ATTACH_FILE_DELETE: 'UC5003',
  NO_ACCESS_RIGHT: 'UC6000',
  LOGIN_OTHER_DEVICE_OLD: 'UC6001',
  LOGIN_OTHER_DEVICE: 'UC6200',

  WRONG_ID_OR_PW: 'LOGIN000',
  PROBLEM_LOGIN: 'LOGIN001',
  PROBLEM_LOGOUT: 'LOGIN002',
  PROBLEM_CHANGE_PUSHID: 'LOGIN003',
  FAIL_CHANGE_PW: 'LOGIN004',
  FAIL_CHANGE_COMP: 'LOGIN005',
  PROBLEM_CHANGE_PRF_IMG: 'LOGIN006',
  PROBLEM_CHANGE_PW: 'LOGIN007',
  PROBLEM_CHANGE_BASIC_COMP: 'LOGIN008',
  PROBLEM_CHANGE_PUSH_STATUS: 'LOGIN009',
  WRONG_APP: 'LOGIN999'
}

const DZError = class DZError extends Error {
  constructor(message, resultCode) {
      super(message);

      this.message = message;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
      this.resultCode = resultCode;
  }
}

export {
  ErrorCode,
  DZError
}
import Const from '../../Lib/VuexConst'

const state = {
  loginCompleted: false,
  title: 'EBP 리뉴얼 메신저',
  CurrentPath: '/'
}

const mutations = {
  [Const.SET_LOGIN] (state) {
    state.loginCompleted = true
  },
  [Const.SET_LOGOUT] (state) {
    state.loginCompleted = false
  },
  [Const.SET_TITLE] (state, payload) {
    state.title = payload.title
  }
}

const getters = {
  getTitle: state => {
    return state.title
  }
}

const actions = {
  [Const.SET_LOGOUT] ({ commit }) {
    // do something async
    commit(Const.SET_LOGOUT)
  },
  [Const.SET_LOGIN] ({commit}) {
    commit(Const.SET_LOGIN)
  },
  [Const.SET_TITLE] ({commit}, payload) {
    commit(Const.SET_TITLE, payload)
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}

import Vue from 'vue'
import Vuetify from 'vuetify/lib'

Vue.use(Vuetify)

const opts = {
  icons: {
    iconfont: 'mdi', //|| 'mdiSvg' || 'md' || 'fa' || 'fa4'
  },
}

export default new Vuetify(opts)
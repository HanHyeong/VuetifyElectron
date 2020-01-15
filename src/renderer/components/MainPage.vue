<template>
  <div class="main">
    <v-navigation-drawer
      v-model="naviVisible"
      :clipped="true"
      mini-variant
      mini-variant-width="60"
      :expand-on-hover="false"
      disable-resize-watcher
      stateless
      app
    >
      <!-- -->
    </v-navigation-drawer>
    <v-app-bar
      class="dragable"
      app
      :clipped-left="true"
      :hidden="!LoginCompleted"
      :height="50"
      dark
    >
      <!-- -->
      <v-app-bar-nav-icon class="no-dragable" @click.stop="naviVisible = !naviVisible"></v-app-bar-nav-icon>
      <v-toolbar-title>{{title}}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-tooltip left>
        <template v-slot:activator="{on}">
          <v-btn class="no-dragable" @click="logout" v-on="on" icon>
            <v-icon>mdi-logout-variant</v-icon>
          </v-btn>
        </template>
        <span>로그아웃</span>
      </v-tooltip>
    </v-app-bar>

    <v-footer app>
      <!-- -->
      <div class="red white--text">
        이건 공지사항이야.
      </div>
    </v-footer>
  </div>
</template>

<script>
import {mapState, mapActions, mapGetters} from 'vuex'
import Const from '../Lib/VuexConst'

export default {
  data: () => ({
    naviVisible: false,
  }),
  mounted() {    
  },
  methods: {
    logout() {
      this.naviVisible = false
      this.setLogout()
      this.$router.push('/')
    },
    ...mapActions({
      setLogout: Const.SET_LOGOUT
    })
  },
  computed: {
    ...mapState({
      LoginCompleted: state => state.Common.loginCompleted
    }),
    ...mapGetters({
      title: 'getTitle'
    })
  }
};
</script>

<style>
.dragable {
  -webkit-app-region: drag;
}

.no-dragable {
  -webkit-app-region: no-drag;
}
</style>
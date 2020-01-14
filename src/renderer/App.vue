<template>
  <div id="app">
    <v-app id="inspire">
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
        style="-webkit-app-region: drag;"
        app
        :clipped-left="true"
        :hidden="!LoginCompleted"
        :height="50"
        dark
      >
        <!-- -->
        <v-app-bar-nav-icon @click.stop="naviVisible = !naviVisible"></v-app-bar-nav-icon>
        <v-toolbar-title>{{title}}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip left>
          <template v-slot:activator="{on}">
            <v-btn @click="logout" v-on="on" icon>
              <v-icon>mdi-logout-variant</v-icon>
            </v-btn>
          </template>
          <span>로그아웃</span>
        </v-tooltip>
      </v-app-bar>

      <!-- Sizes your content based upon application components -->
      <v-content class="indigo">
        <!-- Provides the application the proper gutter -->
        <v-container fluid>
          <!-- If using vue-router -->
          <router-view></router-view>
        </v-container>
      </v-content>

      
    </v-app>
  </div>
</template>

<script>
import {mapState, mapActions, mapGetters} from 'vuex'
import Const from './Lib/VuexConst'
export default {
  name: "BizboxVuetify",
  data: () => ({
    naviVisible: false,
  }),
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
/* CSS */
</style>

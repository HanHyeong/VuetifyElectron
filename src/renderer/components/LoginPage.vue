<template>
  <v-content>
    <v-container fluid fill-height>
      <v-layout align-center justify-center>
        <v-flex xs12 sm8 md4>
          <v-card class="elevation-17" style="-webkit-app-region: no-drag;" :loading="loginLoading">
            <v-toolbar  dark flat>
              <v-toolbar-title>EBP Login</v-toolbar-title>
              <v-spacer></v-spacer>
            </v-toolbar>
            <v-card-text>
              <v-form>
                <v-text-field label="Login" name="login" prepend-icon="person" type="text"></v-text-field>

                <v-text-field
                  id="password"
                  label="Password"
                  name="password"
                  prepend-icon="lock"
                  type="password"
                ></v-text-field>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary"
                @click="clickLogin"
                :loading=loginLoading
              >Login</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
  </v-content>
</template>

<script>
import {mapActions} from 'vuex'
import Const from '../Lib/VuexConst'

export default {
  name: "login-page",
  data: () => ({
    loginLoading: false
  }),
  mounted() {
    console.log(this.$vuetify.breakpoint)
  },
  computed: {
    imageHeight() {
      switch(this.$vuetify.breakpoint.name) {
        case 'xs': return '220px'
        case 'sm': return '400px'
        case 'md': return '500px'
        case 'lg': return '600px'
        case 'xl': return '800px'
      }
    }
  },
  methods: {
    clickLogin() {
      this.loginLoading = true

      // request login
      setTimeout(() => {
        this.loginLoading = false
        this.$router.push('main');
        this.setLogin();
      }, 3000)
      
    },
    ...mapActions({
      setLogin: Const.SET_LOGIN
    })
  }
};
</script>

<style>
</style>
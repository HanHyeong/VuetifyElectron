<template>
  <div id="app">
    <v-app id="inspire">
      <!-- Sizes your content based upon application components -->
      <v-content class="indigo">
        <router-view></router-view>
      </v-content>
    </v-app>
  </div>
</template>

<script>

export default {
  name: "BizboxVuetify",
  
  
};
</script>

<style>
/* CSS */

::-webkit-scrollbar { 
    display: none !important;
}
</style>

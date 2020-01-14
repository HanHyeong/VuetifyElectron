<template>
  <div>
    this is main!!
    <v-footer app>
      <!-- -->
    </v-footer>
  </div>
</template>

<script>
import { mapActions } from "vuex";
export default {
  mounted() {
    this.someAsyncTask();
    console.log("#### main", this.$store.getters.getMain);
  },
  methods: {
    ...mapActions(["someAsyncTask"])
  }
};
</script>

<style>
</style>
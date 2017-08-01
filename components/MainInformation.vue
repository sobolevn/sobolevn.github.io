<template>
  <div class="main-information__component">
    <particles
      :clickEffect="false"
      color="#dedede" />

      <div class="main-information-card">
        <h1>Nikita Sobolev</h1>
        <h2>@sobolevn</h2>

        <div class="main-information-card-icons">
          <a href="https://github.com/sobolevn">
            <icon name="github" scale="2" />
          </a>

          <a href="https://medium.com/@sobolevn">
            <icon name="medium" scale="2" />
          </a>
        </div>
      </div>
  </div>
</template>

<script>
import Particles from './Particles'

export default {
  components: {
    // Internal:
    Particles
  }
}
</script>

<style lang="scss">
.main-information__component {
  background-color: #222;
  height: 100vh;
  position: relative;

  display: flex;
  justify-content: center;
  align-items: center;

  a, a:hover, a:active {
    color: black;
    text-decoration: none;
  }

  #particles-js {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;

    canvas {
      height: 99% !important;
    }
  }

  .main-information-card {
    background-color: #f3f3f3;

    padding: 50px;
    text-align: center;
    z-index: 2;

    .main-information-card-icons {
      margin-top: 30px;

      svg {
        margin: 10px;
      }
    }
  }
}
</style>

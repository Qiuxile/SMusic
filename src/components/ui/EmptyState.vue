<script setup lang="ts">
import Icon from './Icon.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
  }>(),
  { icon: 'music' },
)
</script>

<template>
  <div class="empty-state">
    <span class="icon"><Icon :name="icon" :size="26" /></span>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.015);
}

.icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--accent);
  background: var(--accent-soft);
  margin-bottom: 4px;
}

h3 {
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
}

p {
  max-width: 460px;
  font-size: 13px;
  line-height: 1.7;
}

.actions {
  margin-top: 10px;
}
</style>

# Obsidian tag generator

Or it should be called obsidian tag break down. It breakdowns the nested tags into parent tags and added to the top of the file when you click save. For example,

```md
#ai/image #a/b/c/d #a/b/c/c

will generate this

#a #a/b #a/b/c #ai
```

demo: https://www.youtube.com/watch?v=8M2VLRibpnQ

✅ dead simple, without any configuration

## Notes

1. This plugins only work for tags in the body. Tags in the frontmatter will be ignored.
2. The generator will recognise the comment block. If the comment block doesn't exist, it will create the block at the top of the file. If it exists, it will replace the block.
3. to contribute, please file open a github issue first.

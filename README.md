# Obsidian tag generator

Or it should be called obsidian tag break down. It breakdowns the nested tags into parent tags and added to the top of the file. For example,

```md
#ai/image #a/b/c/d #a/b/c/c

will become

#a #a/b #a/b/c #ai
```

<video src="https://share.cleanshot.com/gmR5Mz3W+" width="100%" height="560px"></video>

## Notes

1. This plugins only work for tags in the body. Tags in the frontmatter will be ignored.
2. to contribute, please file open a github issue

execute if entity @a run execute at @a run structure load AdminUtils:introBook ~ ~ ~
execute at @a[c=1] run execute at @s unless entity @e[type=item,r=1.5,c=1,name=§l§cAdmin§aUtils] run function introBook
execute unless entity @a run function introBook
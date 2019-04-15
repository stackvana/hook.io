# required to be re-run on every operating system reboot
# failure to mount will cause chroot jails to fail
mount -o bind /proc /var/chroot/proc
mount -o bind /dev /var/chroot/dev
mount -o bind /dev/pts /var/chroot/dev/pts
mount -o bind /sys /var/chroot/sys
# failure to increase ulimit can cause to FD exhaustion of system
ulimit -n 65535